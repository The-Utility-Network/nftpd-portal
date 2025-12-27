'use client';
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { getFacets, getDiamondAddress } from '../primitives/Diamond';
import { prepareContractCall, sendAndConfirmTransaction, readContract, getContract, createThirdwebClient } from 'thirdweb';
import { base } from 'thirdweb/chains';
import { ThirdwebProvider, useActiveWallet } from 'thirdweb/react';
import { ethers } from 'ethers';
import { useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import { NoSymbolIcon } from '@heroicons/react/24/solid'; // Import the X icon from Heroicons
import Xarrow, { useXarrow } from 'react-xarrows'; // Import Xarrow
import { XYCoord } from 'dnd-core';
import React from 'react';

// Raw facet type from on-chain loupe
type RawFacet = { target: `0x${string}`; selectors: readonly `0x${string}`[] };

// Helper to apply alpha to an HSL color string like "hsl(265 75% 50%)"
function withAlpha(color: string, alpha: number) {
  try {
    const m = color.match(/^hsl\(([^)]+)\)$/i);
    if (m) return `hsl(${m[1]} / ${alpha})`;
  } catch {}
  // Fallback to grayscale for noir palette
  return `rgba(255, 255, 255, ${alpha})`;
}

// Helper functions to manage localStorage cache
const cacheKey = "directoryCache";

let cachedClient: any | null = null;
async function getThirdwebBrowserClient() {
  if (cachedClient) return cachedClient;
  const resp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
  const { clientId } = await resp.json();
  if (!clientId) throw new Error('Thirdweb client is not configured');
  cachedClient = createThirdwebClient({ clientId });
  return cachedClient;
}

function readCache() {
  const cache = localStorage.getItem(cacheKey);
  return cache
    ? JSON.parse(cache)
    : { contractNames: {}, methodNames: {}, facetNames: {}, facets: [], abis: {} };
}

function writeCache(cache: any) {
  localStorage.setItem(cacheKey, JSON.stringify(cache));
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetch ABI via server proxy (uses server env keys at runtime)
async function fetchABIFromBaseScan(address: string, _apiKey: string, cache: any) {
  if (cache.abis && cache.abis[address]) {
    return cache.abis[address];
  }
  const response = await fetch(`/api/explorer/abi?address=${address}`, { cache: 'no-store' });
  const data = await response.json();

  if (data.status === "1") {
    const abi = JSON.parse(data.result);
    cache.abis[address] = abi;
    writeCache(cache);
    return abi;
  } else {
    console.error(`Error fetching ABI for ${address}: ${data.result}`);
  }
  return null;
}

// Process facets to retrieve method names and facet names
async function processFacets(formattedFacets: any[], apiKey: string, cache: any) {
    const methodNamesLookup: { [key: string]: { readMethods: string[]; writeMethods: string[] } } = {};
    const facetNamesLookup: { [key: string]: string } = {};
  
    for (let i = 0; i < formattedFacets.length; i++) {
      const facet = formattedFacets[i];
      const facetAddress = facet.facetAddress;
  
      const contractName = await fetchContractNameFromBaseScan(facet.facetAddress, apiKey, cache);
      facetNamesLookup[facet.facetAddress] = contractName;
  
      const abi = await fetchABIFromBaseScan(facet.facetAddress, apiKey, cache);
      if (abi) {
        const { readMethods, writeMethods } = classifyMethods(abi, facet.selectors);
        methodNamesLookup[facet.facetAddress] = { readMethods, writeMethods };
      } else {
        methodNamesLookup[facet.facetAddress] = { readMethods: [], writeMethods: [] };
      }
  
      await delay(400); // Prevent API rate limits
    }
    return { methodNamesLookup, facetNamesLookup };
  }

// Fetch contract name via server proxy (uses server env keys at runtime)
async function fetchContractNameFromBaseScan(address: string, _apiKey: string, cache: any) {
  if (cache.contractNames[address]) return cache.contractNames[address];
  const response = await fetch(`/api/explorer/name?address=${address}`, { cache: 'no-store' });
  const data = await response.json();
  if (data.status === "1" && data.result && Array.isArray(data.result) && data.result[0]?.ContractName) {
    const contractName = data.result[0].ContractName;
    cache.contractNames[address] = contractName;
    writeCache(cache);
    return contractName;
  }
  return "Unknown Contract";
}

// Classify methods into read or write based on ABI
function classifyMethods(abi: any[], selectors: string[]) {
  const readMethods: string[] = [];
  const writeMethods: string[] = [];
  const iface = new ethers.Interface(abi);
  for (const selector of selectors) {
    try {
      const method = iface.getFunction(selector);
      if (method) {
        if (method.stateMutability === "view" || method.stateMutability === "pure") {
          readMethods.push(method.name);
        } else {
          writeMethods.push(method.name);
        }
      }
    } catch (error) {
      console.error(`Error classifying selector ${selector}:`, error);
    }
  }
  return { readMethods, writeMethods };
}

// Get method details from ABI
function getMethodDetails(methodName: string, abi: any[]) {
  const method = abi.find((item: any) => item.name === methodName && item.type === 'function');
  if (method) {
    const inputs = method.inputs.map((input: any) => ({
      name: input.name || "param",
      type: input.type,
    }));
    const outputs = method.outputs.map((output: any) => ({
      name: output.name || "",
      type: output.type,
    }));
    return { inputs, outputs };
  }
  return { inputs: [], outputs: [] };
}

// --- Component Definitions ---

interface MethodPanelProps {
    methodName: string;
    inputs: { name: string; type: string; value: string }[];
    outputs: { name: string; type: string; value: string }[];
    isRead: boolean;
    onExecute: () => Promise<void>;
    onDelete: () => void;
    id: string;
    position: { left: number; top: number };
    handleConnectorClick: (
      panelId: string,
      connectorType: 'input' | 'output',
      connectorIndex: number
    ) => void;
    connectorsEnabled: boolean;
    draggable?: boolean;
    onInputChange: (index: number, value: string) => void;
    outputContent: string;
    setOutputContent: (content: string) => void;
    facetColor: string;
  }
  
  const MethodPanel: React.FC<MethodPanelProps> = ({
    methodName,
    inputs,
    outputs,
    isRead,
    onExecute,
    onDelete,
    id,
    position,
    handleConnectorClick,
    connectorsEnabled,
    draggable = true,
    onInputChange,
    outputContent,
    setOutputContent,
    facetColor,
  }) => {
    const [outputModalOpen, setOutputModalOpen] = useState<boolean>(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const updateXarrow = useXarrow();
    const [isDragging, setIsDragging] = useState(false);
    const [isConnectorDragging, setIsConnectorDragging] = useState(false);
  
    useEffect(() => {
        const timeout = setTimeout(() => updateXarrow(), 200); // Throttle updateXarrow
        return () => clearTimeout(timeout);
    // Only depend on position or specific variables that affect arrow positions
    }, [position.left, position.top, updateXarrow]);
      
  
    const handleConnectorMouseDown = (connectorType: string, index: number) => {
      if (connectorsEnabled) {
        setIsConnectorDragging(true);
        handleConnectorClick(id, connectorType as 'input' | 'output', index);
      }
    };
  
    const handleConnectorMouseUp = () => {
      setIsConnectorDragging(false);
    };

    const handleInputChange = (index: number, value: string) => {
        // Call the prop function to update inputs in Workspace
        onInputChange(index, value);
      };
  
    useEffect(() => {
      window.addEventListener('mouseup', handleConnectorMouseUp);
      return () => {
        window.removeEventListener('mouseup', handleConnectorMouseUp);
      };
    }, []);     
  
    const toggleModal = () => setOutputModalOpen(!outputModalOpen);
  
    const handleExecuteClick = async () => {
        await onExecute();
      };
  
    return (
    <div
        ref={panelRef}
        className={`p-4 rounded-xl shadow-md m-2 text-gray-100 dark:text-gray-100 transition-transform transform ${
          isDragging ? 'scale-95' : 'scale-100'
        }`}
        style={{
          overflow: 'auto',
          position: 'absolute',
          left: position.left,
          top: position.top,
          width: '300px',
          maxHeight: '400px',
          background: isRead
            ? `linear-gradient(180deg, ${withAlpha(facetColor, 0.18)}, ${withAlpha(facetColor, 0.10)})`
            : `linear-gradient(180deg, ${withAlpha(facetColor, 0.35)}, ${withAlpha(facetColor, 0.22)})`,
          boxShadow: isRead
            ? `0 4px 18px ${withAlpha(facetColor, 0.25)}`
            : `0 6px 22px ${withAlpha(facetColor, 0.40)}`,
          border: `1px solid ${withAlpha(facetColor, 0.35)}`,
          backdropFilter: 'blur(10px)'
        }}
    >
        {/* Input and Output Connectors */}
        <div className="relative flex justify-between items-center mb-2">
          <div className="flex">
            {inputs.map((_, index) => (
              <div
                key={index}
                id={`input-${id}-input-${index}`}
                className="h-3 w-3 mr-2 rounded-full cursor-pointer"
                style={{ backgroundColor: withAlpha(facetColor, 0.6) }}
                onMouseDown={() => handleConnectorMouseDown('input', index)}
              />
            ))}
          </div>
  
          {/* Centered Tab Line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 top-0.5 h-0.5 bg-white w-1/4"></div>
  
          <div className="flex">
            {outputs.map((_, index) => (
              <div
                key={index}
                id={`output-${id}-output-${index}`}
                className="h-3 w-3 rounded-full cursor-pointer"
                style={{ backgroundColor: withAlpha(facetColor, 0.9) }}
                onMouseDown={() => handleConnectorMouseDown('output', index)}
              />
            ))}
          </div>
        </div>
  
        <h4
          className={`text-sm ${isRead ? 'font-medium' : 'font-bold'} pb-2`}
          style={{ color: isRead ? 'rgba(255,255,255,0.92)' : '#fff', textShadow: isRead ? `0 0 10px ${facetColor}55` : `0 0 12px ${facetColor}` }}
        >
          {methodName}
        </h4>
  
        {/* Display input fields */}
        {inputs.length === 0 ? (
          <p className="text-sm text-gray-200 pt-2 pb-2 dark:text-gray-200 italic">
            No inputs required
          </p>
        ) : (
          inputs.map((input, index) => (
            <input
            key={index}
            type="text"
            placeholder={`${input.name} (${input.type})`}
            className={`text-sm text-gray-100 dark:text-gray-100 p-2 rounded-md mb-1 w-full border`}
            style={{ background: isRead ? withAlpha(facetColor, 0.10) : withAlpha(facetColor, 0.16), borderColor: withAlpha(facetColor, 0.35) }}
            value={input.value || ''}
            onChange={(e) => handleInputChange(index, e.target.value)}
            />
          ))
        )}
  
        {outputs.length === 0 ? (
        <p className="text-sm text-gray-200 pt-2 dark:text-gray-200 italic">
            No outputs available
        </p>
        ) : (
        outputs.map((output, index) => {
            // console.log(`Output ${index} value:`, output.value);
            return (
            <p
                key={index}
                className="text-sm text-gray-300 dark:text-gray-300 p-2 rounded-md mb-1 break-words w-full border"
                style={{ background: withAlpha(facetColor, 0.12), borderColor: withAlpha(facetColor, 0.30) }}
            >
                {output.name} ({output.type}): {output.value !== undefined ? String(output.value) : 'N/A'}
            </p>
            );
        })
        )}
  
        <div className="flex justify-between items-center mt-4">
          <button
            className={`p-2 rounded-md text-white text-xs border`}
            style={{ background: isRead ? withAlpha(facetColor, 0.28) : withAlpha(facetColor, 0.42), borderColor: withAlpha(facetColor, 0.45) }}
            onClick={handleExecuteClick}
          >
            {isRead ? 'Read' : 'Write'}
          </button>
  
          <button
            className="p-2 rounded-md text-white text-xs border"
            style={{ background: withAlpha(facetColor, 0.26), borderColor: withAlpha(facetColor, 0.35) }}
            onClick={toggleModal}
          >
            View Output
          </button>
  
          <button
            onClick={onDelete}
            className="p-2 rounded-full text-black text-xs flex justify-center items-center w-8 h-8 border"
            style={{ background: withAlpha(facetColor, 0.22), borderColor: withAlpha(facetColor, 0.35) }}
          >
            <NoSymbolIcon className="h-4 w-4" />
          </button>
        </div>
  
        <Modal isOpen={outputModalOpen} onClose={toggleModal} content={outputContent} />
      </div>
    );
  };
  
  // Modal component
  const Modal: React.FC<{ isOpen: boolean; onClose: () => void; content: string }> = ({
    isOpen,
    onClose,
    content,
  }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 flex justify-center items-center z-50 bg-gray-800 bg-opacity-75">
        <div className="bg-white dark:bg-gray-900 p-2 rounded-lg shadow-lg w-4/5 max-h-44 overflow-auto">
          <div className="text-right">
            <button onClick={onClose} className="text-white">
              X
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-gray-200 dark:text-gray-200">
            {content}
          </pre>
        </div>
      </div>
    );
  };
  

interface Panel {
    id: string;
    methodName: string;
    inputs: { name: string; type: string; value: string }[];
    outputs: { name: string; type: string; value: string }[];
    isRead: boolean;
    position: { left: number; top: number };
  }
  
  interface Connection {
    from: {
      panelId: string;
      connectorType: 'input' | 'output';
      connectorIndex: number;
    };
    to: {
      panelId: string;
      connectorType: 'input' | 'output';
      connectorIndex: number;
    };
  }
  
  interface WorkspaceProps {
    contractABI: any[];
    facetColor: string;
  }

  const Workspace: React.FC<WorkspaceProps> = ({ contractABI, facetColor }) => {
    const [panels, setPanels] = useState<Panel[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const workspaceRef = useRef<HTMLDivElement>(null);
    const [isConnectorDragging, setIsConnectorDragging] = useState(false);
    const [outputContents, setOutputContents] = useState<{ [key: string]: string }>({});
    const [currentDragging, setCurrentDragging] = useState<null | {
      panelId: string;
      connectorType: 'input' | 'output';
      connectorIndex: number;
    }>(null);
    const [tempConnection, setTempConnection] = useState<{
      from: { panelId: string; connectorType: 'input' | 'output'; connectorIndex: number };
      to: { x: number; y: number };
    } | null>(null);
    const updateXarrow = useXarrow();
    const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>(
      { open: false, title: '', message: '' }
    );
  
    const wallet = useActiveWallet()?.getAccount() as any;

    const handleInputChange = (panelId: string, index: number, value: string) => {
        setPanels(prevPanels => prevPanels.map(panel => {
          if (panel.id === panelId) {
            const newInputs = [...panel.inputs];
            newInputs[index] = { ...newInputs[index], value };
            return { ...panel, inputs: newInputs };
          }
          return panel;
        }));
    };
    
  
    // Removed hardcoded placeholder ABI; will use the runtime `contractABI` from props for all calls
  
    // Drop function for adding new panels
    const [{ isOver }, drop] = useDrop({
      accept: 'method',
      drop: (item: { methodName: string; isRead: boolean; inputs: any[]; outputs: any[] }, monitor) => {
        const offset = monitor.getClientOffset();
        const workspaceRect = workspaceRef.current?.getBoundingClientRect();
  
        if (workspaceRect && offset) {
          // Calculate the position of the dropped panel relative to the workspace
          const left = offset.x - workspaceRect.left;
          const top = offset.y - workspaceRect.top;
  
          // Create a new panel at the drop position
          const newPanel: Panel = {
            id: `panel-${panels.length}`,
            methodName: item.methodName,
            inputs: item.inputs,
            outputs: item.outputs,
            isRead: item.isRead,
            position: { left, top }, // Store the position for absolute positioning
          };
  
          setPanels(prevPanels => [...prevPanels, newPanel]);
        }
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    });
  
    useEffect(() => {
      if (workspaceRef.current) {
        drop(workspaceRef.current);
      }
    }, [drop]);
  
    useEffect(() => {
        const timeout = setTimeout(() => updateXarrow(), 200); // Throttle updateXarrow
        return () => clearTimeout(timeout);
      }, [connections, tempConnection, updateXarrow]);      
  
    // Handle connector clicks
    const handleConnectorClick = (
        panelId: string,
        connectorType: 'input' | 'output',
        connectorIndex: number
      ) => {
        if (currentDragging) {
          // Prevent connecting the same type
          if (currentDragging.connectorType === connectorType) {
            setCurrentDragging(null);
            setTempConnection(null);
            return;
          }
      
          const fromPanel = panels.find((p) => p.id === currentDragging.panelId);
          const toPanel = panels.find((p) => p.id === panelId);
      
          if (!fromPanel || !toPanel) return;
      
          const fromConnector = currentDragging.connectorType === 'output' 
            ? fromPanel.outputs[currentDragging.connectorIndex] 
            : fromPanel.inputs[currentDragging.connectorIndex];
      
          const toConnector = connectorType === 'output' 
            ? toPanel.outputs[connectorIndex] 
            : toPanel.inputs[connectorIndex];
      
          // Ensure connection is from output to input
          if (currentDragging.connectorType === 'output' && connectorType === 'input') {
            // Type Compatibility Check
            if (fromConnector.type !== toConnector.type) {
              setErrorModal({ open: true, title: 'Type Mismatch', message: 'Input and output types are incompatible.' });
              setCurrentDragging(null);
              setTempConnection(null);
              return;
            }
      
            // Save the connection
            setConnections((prevConnections) => [
              ...prevConnections,
              {
                from: currentDragging,
                to: { panelId, connectorType, connectorIndex },
              },
            ]);
      
            setCurrentDragging(null);
            setTempConnection(null);
          } else {
            setErrorModal({ open: true, title: 'Invalid Connection', message: 'Connect from an output to an input only.' });
            setCurrentDragging(null);
            setTempConnection(null);
          }
        } else {
          // Start dragging from output connector only
          if (connectorType === 'output') {
            setCurrentDragging({ panelId, connectorType, connectorIndex });
            setTempConnection({
              from: { panelId, connectorType, connectorIndex },
              to: { x: 0, y: 0 },
            });
          } else {
            setErrorModal({ open: true, title: 'Start From Output', message: 'Start a connection from an output connector.' });
          }
        }
      };      
  
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (tempConnection) {
          const rect = workspaceRef.current?.getBoundingClientRect();
          if (rect) {
            setMousePosition({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
          }
        }
      };
  
      window.addEventListener('mousemove', handleMouseMove);
  
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }, [tempConnection]);
  
    useEffect(() => {
      const handleMouseUp = (e: MouseEvent) => {
        if (e.button === 0) { // Left-click
          setIsConnectorDragging(false);
        }
      };
  
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);
  
    const deletePanel = (index: number) => {
      setPanels((prev) => prev.filter((_, i) => i !== index));
      // Also remove any connections associated with this panel
      setConnections((prev) =>
        prev.filter(
          (conn) => conn.from.panelId !== panels[index].id && conn.to.panelId !== panels[index].id
        )
      );
    };

    const propagateOutput = (fromPanelId: string, connectorIndex: number, outputValue: any) => {
        // Find all connections originating from this panel's specific output connector
        const relevantConnections = connections.filter(
          (conn) => 
            conn.from.panelId === fromPanelId &&
            conn.from.connectorType === 'output' &&
            conn.from.connectorIndex === connectorIndex
        );
      
        relevantConnections.forEach((conn) => {
          const { to } = conn;
          setPanels((prevPanels) =>
            prevPanels.map((panel) => {
              if (panel.id === to.panelId) {
                const updatedInputs = [...panel.inputs];
                updatedInputs[to.connectorIndex] = {
                  ...updatedInputs[to.connectorIndex],
                  value: outputValue, // Assign the propagated value
                };
                return { ...panel, inputs: updatedInputs };
              }
              return panel;
            })
          );
        });
      };      

      const formatInput = (input: {
          name: any; type: string; value: string 
}): any => {
        try {
          switch (input.type) {
            case 'address':
              return ethers.getAddress(input.value);
            case 'uint256':
            case 'uint8':
            case 'int256':
            case 'int8':
              return BigInt(input.value);
            case 'bool':
              return input.value.toLowerCase() === 'true';
            case 'string':
              return input.value;
            case 'bytes':
              return Array(input.value);
            // Add more cases as needed, e.g., arrays, structs
            case 'uint256[]':
                return input.value.split(',').map((val) => BigInt(val.trim()));
            case 'address[]':
                return input.value.split(',').map((val) => ethers.getAddress(val.trim()));
            // Add similar cases for other array types

            default:
              console.warn(`Unhandled input type: ${input.type}. Treating as string.`);
              return input.value;
          }
        } catch (error:any) {
          console.error(`Error formatting input (${input.name}):`, error);
          throw new Error(`Invalid input for ${input.name}: ${error.message}`);
        }
      };      
  
      const handleExecute = async (panelId: string) => {
        const panel = panels.find(p => p.id === panelId);
        if (!panel) return;
      
        try {
          const client = await getThirdwebBrowserClient();
          const address = await getDiamondAddress();
          if (!contractABI || contractABI.length === 0) {
            setOutputContents(prev => ({
              ...prev,
              [panelId]: 'Error: Contract ABI not loaded. Please ensure the Directory facet ABI is available.'
            }));
            return;
          }

          const contract = getContract({
            client,
            chain: base,
            address,
            abi: contractABI as any,
          });
      
          // Convert inputs using formatInput
          const formattedInputs = panel.inputs.map((input) => formatInput(input));
      
          if (panel.isRead) {
            const result = await readContract({
              contract,
              method: panel.methodName as any,
              params: formattedInputs,
            });
      
            // Handle multiple outputs
            const outputValues = Array.isArray(result) ? result : [result];
      
            setPanels((prevPanels) =>
              prevPanels.map((p) => {
                if (p.id === panelId) {
                  const updatedOutputs = p.outputs.map((output, idx) => ({
                    ...output,
                    value: outputValues[idx] !== undefined ? outputValues[idx] : 'N/A',
                  }));
                  return { ...p, outputs: updatedOutputs };
                }
                return p;
              })
            );

            // Set outputContents for the modal
            setOutputContents(prev => ({
                ...prev,
                [panelId]: JSON.stringify(outputValues, null, 2), // Stringify outputs
            }));
      
            // Propagate each output value to connected inputs
            outputValues.forEach((val, idx) => {
              propagateOutput(panelId, idx, val);
            });
      
            return result;
          } else {
            if (!wallet) {
              setOutputContents(prev => ({
                ...prev,
                [panelId]: 'Error: No connected wallet found. Please connect your wallet to execute write methods.'
              }));
              return;
            }
            const transaction = prepareContractCall({
              contract,
              method: panel.methodName as any,
              params: formattedInputs,
              value: BigInt(0),
            });
            const receipt = await sendAndConfirmTransaction({
              transaction,
              account: wallet,
            });
      
            setOutputContents(prev => ({
              ...prev,
              [panelId]: JSON.stringify(receipt, null, 2),
            }));
          }
        } catch (error: any) {
          console.error('Error executing contract:', error);

          // Extract meaningful error message
          let errorMessage = 'Unknown error';
          if (error.reason) {
            errorMessage = error.reason;
          } else if (error.message) {
            errorMessage = error.message;
          }

          setOutputContents(prev => ({
            ...prev,
            [panelId]: `Error: ${errorMessage}`,
          }));
        }
      };
  
    return (
      <div
        ref={workspaceRef}
        className="relative h-full p-4 bg-white/30 dark:bg-gray-800/30 backdrop-blur-lg rounded-lg overflow-auto"
      >
        <button
          onClick={() => setConnections([])}
          className="p-2 rounded-md bg-black/40 backdrop-blur-lg text-white mb-2"
        >
          Reset Connections
        </button>
        {/* Show message if no panels are present */}
        {panels.length === 0 && (
          <div className="flex flex-col items-center justify-center h-5/6 space-y-4">
            <img 
              src="/Medallions/NFTPD.png" 
              alt="NFTPD Medallion" 
              className="w-64 h-64 object-contain mb-2" 
            />
            <h2 className="text-3xl font-bold text-gray-200 dark:text-gray-200 text-center">
              Welcome to the NFTPD Directory!
            </h2>
            <p className="text-xl font-semibold text-gray-300 dark:text-gray-300 text-center">
              Drag & Drop a Method Here To Get Started
            </p>
          </div>
        )}
        {panels.map((panel, index) => (
          <MethodPanel
            key={panel.id}
            id={panel.id}
            methodName={panel.methodName}
            inputs={panel.inputs}
            outputs={panel.outputs}
            isRead={panel.isRead}
            onExecute={() => handleExecute(panel.id)}
            onDelete={() => deletePanel(index)}
            position={panel.position}
            handleConnectorClick={handleConnectorClick}
            connectorsEnabled={true}
            draggable={true}
            onInputChange={(index, value) => handleInputChange(panel.id, index, value)}
            outputContent={outputContents[panel.id] || ''}
            setOutputContent={(content) => {
                setOutputContents((prev) => ({ ...prev, [panel.id]: content }));
            }}
            facetColor={facetColor}
            />
        ))}
        {connections.map((connection, index) => (
          <Xarrow
            key={index}
            start={`${
              connection.from.connectorType
            }-${connection.from.panelId}-${connection.from.connectorType}-${
              connection.from.connectorIndex
            }`}
            end={`${
              connection.to.connectorType
            }-${connection.to.panelId}-${connection.to.connectorType}-${connection.to.connectorIndex}`}
            color="gray"
            strokeWidth={2}
            curveness={0.5}
            animateDrawing
          />
        ))}
  
        {tempConnection && mousePosition && (
          <>
            <div
              id="mouse-pointer"
              style={{
                position: 'absolute',
                top: mousePosition.y,
                left: mousePosition.x,
                width: '1px',
                height: '1px',
                pointerEvents: 'none',
              }}
            ></div>
            <Xarrow
              start={`${
                tempConnection.from.connectorType
              }-${tempConnection.from.panelId}-${tempConnection.from.connectorType}-${
                tempConnection.from.connectorIndex
              }`}
              end="mouse-pointer"
              color="#F54029"
              strokeWidth={2}
              curveness={0.5}
              animateDrawing
            />
          </>
        )}

        {errorModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setErrorModal({ open: false, title: '', message: '' })} />
            <div className="relative z-10 w-full max-w-sm rounded-xl border border-white/10 shadow-2xl p-4"
                 style={{ background: `linear-gradient(180deg, ${withAlpha(facetColor, 0.30)}, ${withAlpha(facetColor, 0.18)})` }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold text-sm" style={{ textShadow: `0 0 10px ${withAlpha(facetColor, 0.6)}` }}>{errorModal.title}</h4>
                <button
                  className="text-white/80 hover:text-white text-xs px-2 py-1 rounded"
                  style={{ background: withAlpha(facetColor, 0.22) }}
                  onClick={() => setErrorModal({ open: false, title: '', message: '' })}
                >
                  Close
                </button>
              </div>
              <p className="text-white/90 text-xs leading-relaxed">{errorModal.message}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Define the MethodItem component
interface MethodItemProps {
    methodName: string;
    isRead: boolean;
    inputs: any[];
    outputs: any[];
    className: any;
    facetColor?: string;
  }
  
  const MethodItem: React.FC<MethodItemProps> = React.memo(({ methodName, isRead, inputs, outputs, facetColor = '#ffffff' }) => {
    MethodItem.displayName = 'MethodItem';
    const [{ isDragging }, drag] = useDrag({
      type: 'method',
      item: { methodName, isRead, inputs, outputs },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    });
  
    const ref = useRef<HTMLDivElement>(null);
  
    drag(ref);
  
    return (
      <div
        ref={ref}
        className={`p-2 rounded-xl mb-2 cursor-move text-white border border-white/10 shadow-md`}
        style={{
          opacity: isDragging ? 0.5 : 1,
          background: isRead
            ? `linear-gradient(180deg, ${withAlpha(facetColor, 0.18)}, ${withAlpha(facetColor, 0.10)})`
            : `linear-gradient(180deg, ${withAlpha(facetColor, 0.35)}, ${withAlpha(facetColor, 0.22)})`,
          boxShadow: isRead
            ? `0 4px 18px ${withAlpha(facetColor, 0.25)}`
            : `0 6px 22px ${withAlpha(facetColor, 0.4)}`,
          backdropFilter: 'blur(10px)'
        }}
      >
        <h4
          className={`text-sm ${isRead ? 'font-medium' : 'font-bold'}`}
          style={{
            color: isRead ? 'rgba(255,255,255,0.92)' : '#fff',
            textShadow: isRead ? `0 0 10px ${facetColor}55` : `0 0 12px ${facetColor}`,
          }}
        >
          {methodName}
        </h4>
      </div>
    );
  });
  
  const Directory: React.FC = () => {
    const [facetMethods, setFacetMethods] = useState<{
      readMethods: string[];
      writeMethods: string[];
    }>({
      readMethods: [],
      writeMethods: [],
    });
    const [contractABI, setContractABI] = useState<any[]>([]);
    const [facetColor, setFacetColor] = useState<string>('#ffffff');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
  
    useEffect(() => {
      const fetchFacetData = async () => {
        try {
          const cache = readCache();
          const apiKey = process.env.NEXT_PUBLIC_EXPLORER_API_KEY;
  
          let facets: RawFacet[];
          let methodNamesLookup: { [key: string]: { readMethods: string[]; writeMethods: string[] } };
          let facetNamesLookup: { [key: string]: string };
  
          if (cache && cache.methodNames && cache.facetNames && cache.facets) {
            facets = cache.facets as RawFacet[];
            methodNamesLookup = cache.methodNames;
            facetNamesLookup = cache.facetNames;
          } else {
            facets = (await getFacets()) as unknown as RawFacet[];
            const formattedFacets = facets.map((facet) => ({
              facetAddress: facet.target,
              selectors: Array.from(facet.selectors),
            }));
  
            const result = await processFacets(formattedFacets, apiKey!, cache);
            methodNamesLookup = result.methodNamesLookup;
            facetNamesLookup = result.facetNamesLookup;

            // Persist methods and facets to client-side cache for subsequent loads
            cache.methodNames = methodNamesLookup;
            cache.facetNames = facetNamesLookup;
            cache.facets = facets;
            writeCache(cache);
          }
  
          // Prefer runtime-provided facet name from server config, fallback to build-time env
          let directoryFacetName: string | null = null;
          let directoryFacetAddressFromConfig: string | null = null;
          try {
            const cfgResp = await fetch('/api/config', { cache: 'no-store' });
            const cfg = await cfgResp.json();
            directoryFacetName = cfg?.directoryFacetName || null;
            directoryFacetAddressFromConfig = cfg?.directoryFacetAddress || null;
          } catch {}
          if (!directoryFacetName) {
            directoryFacetName = (process.env.NEXT_PUBLIC_DIRECTORY_FACET as any) || null;
          }
          // If the address is provided directly in config, trust it first
          let directoryFacetAddress = directoryFacetAddressFromConfig || undefined;
          if (!directoryFacetAddress && directoryFacetName) {
            directoryFacetAddress = Object.keys(facetNamesLookup).find(
              (facetAddress) => facetNamesLookup[facetAddress] === directoryFacetName
            );
          }
  
          if (directoryFacetAddress) {
            const abi = await fetchABIFromBaseScan(directoryFacetAddress, apiKey!, cache);
            if (abi) {
              setContractABI(abi);

              // Derive methods robustly if cache entry is missing or incomplete
              const cachedEntry = methodNamesLookup[directoryFacetAddress];
              let readMethods: string[] = cachedEntry?.readMethods || [];
              let writeMethods: string[] = cachedEntry?.writeMethods || [];

              if (readMethods.length === 0 && writeMethods.length === 0) {
                // Fallback: derive directly from ABI
                const functions = Array.isArray(abi)
                  ? abi.filter((item: any) => item && item.type === 'function')
                  : [];
                readMethods = functions
                  .filter((fn: any) => fn.stateMutability === 'view' || fn.stateMutability === 'pure')
                  .map((fn: any) => fn.name)
                  .filter(Boolean);
                writeMethods = functions
                  .filter((fn: any) => fn.stateMutability !== 'view' && fn.stateMutability !== 'pure')
                  .map((fn: any) => fn.name)
                  .filter(Boolean);
                methodNamesLookup[directoryFacetAddress] = { readMethods, writeMethods };
              }

              setFacetMethods({
                readMethods,
                writeMethods,
              });

              // Cache the specific directory facet ABI and method set for faster reloads
              cache.abis[directoryFacetAddress] = abi;
              cache.methodNames = cache.methodNames || {};
              cache.methodNames[directoryFacetAddress] = methodNamesLookup[directoryFacetAddress];
              writeCache(cache);

              // Compute color consistent with DiamondRings tube based on facet index
              const facetIndex = facets.findIndex((f: any) => (f.target || f.facetAddress) === directoryFacetAddress);
              const l = 70 + ((facetIndex >= 0 ? facetIndex : 0) % 6) * 4; // grayscale lightness
              setFacetColor(`hsl(0 0% ${l}%)`);
            } else {
              setError('Failed to fetch ABI for the directory facet');
            }
          } else {
            // Be resilient: show available facet names to aid configuration and retry once after a short delay
            const availableNames = Object.values(facetNamesLookup).filter(Boolean);
            setError(availableNames.length
              ? `Directory facet not found. Available facets: ${availableNames.slice(0, 10).join(', ')}${availableNames.length > 10 ? ', …' : ''}`
              : 'Directory facet not found');
            // One-shot retry after brief delay in case explorer API just populated cache
            setTimeout(() => {
              const name = directoryFacetName;
              const addr = name ? Object.keys(facetNamesLookup).find((fa) => facetNamesLookup[fa] === name) : undefined;
              if (addr) {
                setContractABI(cache.abis[addr] || []);
                setFacetMethods({
                  readMethods: methodNamesLookup[addr]?.readMethods || [],
                  writeMethods: methodNamesLookup[addr]?.writeMethods || [],
                });
                setError(null);
              }
            }, 500);
          }
  
          setLoading(false);
        } catch (error) {
          console.error('Error fetching facet data:', error);
          setError('Failed to load facet data');
          setLoading(false);
        }
      };
  
      fetchFacetData();
    }, []);
  
    return (
      <DndProvider backend={HTML5Backend}>
        <div className="p-1 flex flex-col md:flex-row h-screen pt-8 pb-20">
          {/* Sidebar */}
          <div
            className="w-full md:w-1/4 md:border-r p-4 backdrop-blur-lg rounded-lg overflow-y-auto md:max-h-screen md:h-full flex-shrink-0"
            style={{
              background: `linear-gradient(180deg, ${withAlpha(facetColor, 0.18)}, ${withAlpha(facetColor, 0.10)})`,
              boxShadow: `0 4px 18px ${withAlpha(facetColor, 0.25)}`,
              border: `1px solid ${withAlpha(facetColor, 0.35)}`,
            }}
          >
            <h2 className="text-2xl mb-4 text-gray-100 dark:text-gray-100">Company Directory</h2>

            {loading ? (
              <p>Loading methods...</p>
            ) : error ? (
              <p className="text-white">{error}</p>
            ) : (
              <>
                {/* Combined Methods Section */}
                <div className="flex flex-row space-x-4 overflow-x-auto scroll-smooth md:flex-col md:space-x-0 md:space-y-4 md:overflow-x-visible">
                  {/* Read Methods */}
                  <h3
                    className="text-xl mb-2"
                    style={{ color: facetColor, opacity: 0.9, textShadow: `0 0 14px ${withAlpha(facetColor, 0.6)}` }}
                  >
                    Read Methods
                  </h3>
                  {facetMethods.readMethods.map((method, index) => {
                    const methodDetails = contractABI
                      ? getMethodDetails(method, contractABI)
                      : { inputs: [], outputs: [] };

                    return (
                      <MethodItem
                        key={`read-${index}`}
                        methodName={method}
                        isRead={true}
                        inputs={methodDetails.inputs}
                        outputs={methodDetails.outputs}
                        className="flex-shrink-0 min-w-[200px]" // Ensure horizontal scroll on mobile
                        facetColor={facetColor}
                      />
                    );
                  })}

                  {/* Write Methods */}
                  <h3
                    className="text-xl mb-2 font-bold"
                    style={{ color: facetColor, textShadow: `0 0 16px ${withAlpha(facetColor, 0.8)}` }}
                  >
                    Write Methods
                  </h3>
                  {facetMethods.writeMethods.map((method, index) => {
                    const methodDetails = contractABI
                      ? getMethodDetails(method, contractABI)
                      : { inputs: [], outputs: [] };

                    return (
                      <MethodItem
                        key={`write-${index}`}
                        methodName={method}
                        isRead={false}
                        inputs={methodDetails.inputs}
                        outputs={methodDetails.outputs}
                        className="flex-shrink-0 min-w-[200px]" // Ensure horizontal scroll on mobile
                        facetColor={facetColor}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Workspace */}
          <div className="w-full h-full md:w-3/4">
            <Workspace contractABI={contractABI} facetColor={facetColor} />
          </div>
        </div>
      </DndProvider>
    );
  };
  
  export default Directory;



