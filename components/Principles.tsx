import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import {
  getContract,
  readContract,
  prepareContractCall,
  sendAndConfirmTransaction,
  createThirdwebClient,
} from 'thirdweb';
import { useActiveWallet } from 'thirdweb/react';
import { base } from 'thirdweb/chains';
import { getDiamondAddress } from '../primitives/Diamond';

// Browser-safe Thirdweb client getter (fetches clientId from API)
let principlesClientCache: any | null = null;
async function getThirdwebBrowserClient() {
  if (principlesClientCache) return principlesClientCache;
  const resp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
  const { clientId } = await resp.json();
  if (!clientId) throw new Error('Thirdweb client is not configured');
  principlesClientCache = createThirdwebClient({ clientId });
  return principlesClientCache;
}

// Replace with your actual contract address
let contractAddressPromise: Promise<string> | null = null;
const getContractAddress = async () => {
  if (!contractAddressPromise) contractAddressPromise = getDiamondAddress();
  return contractAddressPromise;
};

// Contract ABI
const abi: any = [
  { "inputs": [], "name": "EnumerableSet__IndexOutOfBounds", "type": "error" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "string", "name": "name", "type": "string" }, { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }], "name": "PrinciplesAccepted", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "user", "type": "address" }, { "indexed": false, "internalType": "string", "name": "oldName", "type": "string" }, { "indexed": false, "internalType": "string", "name": "newName", "type": "string" }], "name": "SignerNameUpdated", "type": "event" },
  { "inputs": [{ "internalType": "string", "name": "name", "type": "string" }], "name": "acceptPrinciples", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "getAcceptanceSignature", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "pure", "type": "function" },
  { "inputs": [], "name": "getAllPrinciples", "outputs": [{ "components": [{ "internalType": "string", "name": "japaneseName", "type": "string" }, { "internalType": "string", "name": "englishName", "type": "string" }, { "internalType": "string", "name": "description", "type": "string" }], "internalType": "struct TUCOperatingPrinciples.Principle[]", "name": "", "type": "tuple[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getAllSigners", "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }], "name": "getPrinciple", "outputs": [{ "internalType": "string", "name": "", "type": "string" }, { "internalType": "string", "name": "", "type": "string" }, { "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getPrincipleCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getSignerCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "signer", "type": "address" }], "name": "getSignerDetails", "outputs": [{ "internalType": "string", "name": "name", "type": "string" }, { "internalType": "uint256", "name": "timestamp", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "hasPrinciplesAccepted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "initializePrinciples", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "isPrinciplesInitialized", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "signer", "type": "address" }, { "internalType": "string", "name": "newName", "type": "string" }], "name": "updateSignerName", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

// Safe read wrapper
async function safeRead(contract: any, method: string, params: any[] = [], fallback: any) {
  try {
    return await readContract({ contract, method: method as any, params } as any);
  } catch (err) {
    console.error(`Safe read failed for ${method}:`, err);
    return fallback;
  }
}

// Define a set of unique colors for expanded accordions (Tailwind classes or inline styles for specific colors)
const principleColors = [
  'bg-red-500/20',   // Light Red
  'bg-blue-500/20',   // Light Blue
  'bg-yellow-500/20',   // Light Yellow
  'bg-teal-500/20',   // Light Teal
  'bg-purple-500/20',  // Light Purple
  'bg-orange-500/20',   // Light Orange
  'bg-gray-500/20',  // Light Gray
  'bg-amber-500/20',   // Another Light Yellow
];

const OperatingPrinciples = () => {
  const [principles, setPrinciples] = useState<any[]>([]);
  const [signerCount, setSignerCount] = useState<number>(0);
  const [hasAccepted, setHasAccepted] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedIndex, setExpandedIndex] = useState<number | false>(false);

  const wallet = useActiveWallet()?.getAccount() as any;

  useEffect(() => {
    initializeAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  const fetchPrinciples = async () => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getContractAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      // if not initialized, do not call methods that revert
      const initialized = await safeRead(contract, 'isPrinciplesInitialized', [], false as any);
      if (!initialized) {
        setPrinciples([]);
        setSignerCount(0);
        setHasAccepted(false);
        setLoading(false);
        return;
      }

      const result = await safeRead(contract, 'getAllPrinciples', [], [] as any);
      setPrinciples(Array.isArray(result) ? result : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching principles:', error);
      setPrinciples([]);
      setLoading(false);
    }
  };

  const fetchSignerCount = async () => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getContractAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const initialized = await safeRead(contract, 'isPrinciplesInitialized', [], false as any);
      if (!initialized) {
        setSignerCount(0);
        return;
      }

      const count = await safeRead(contract, 'getSignerCount', [], 0 as any);
      setSignerCount(Number(count || 0));
    } catch (error) {
      console.error('Error fetching signer count:', error);
      setSignerCount(0);
    }
  };

  const initializeAndLoad = async () => {
    await fetchPrinciples();
    await fetchSignerCount();
    if (wallet) {
      await checkIfUserHasAccepted();
    }
  };

  const checkIfUserHasAccepted = async () => {
    try {
      const client = await getThirdwebBrowserClient();
      const address = await getContractAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const initialized = await safeRead(contract, 'isPrinciplesInitialized', [], false as any);
      if (!initialized) {
        setHasAccepted(false);
        return;
      }

      const accepted = await safeRead(contract, 'hasPrinciplesAccepted', [wallet.address], false as any);
      setHasAccepted(Boolean(accepted));
    } catch (error) {
      console.error('Error checking acceptance:', error);
      setHasAccepted(false);
    }
  };

  const handleAcceptPrinciples = async () => {
    if (!userName.trim()) {
      alert('Please enter your name before signing.');
      return;
    }

    try {
      const client = await getThirdwebBrowserClient();
      const address = await getContractAddress();
      const contract = getContract({
        client,
        chain: base,
        address,
        abi: abi,
      });

      const transaction = prepareContractCall({
        contract,
        method: 'acceptPrinciples',
        params: [userName],
        value: BigInt(0),
      });

      await sendAndConfirmTransaction({
        transaction,
        account: wallet!,
      });

      setHasAccepted(true);
      fetchSignerCount();
    } catch (error) {
      console.error('Error accepting principles:', error);
    }
  };

  const handleAccordionChange = (index: number) => {
    setExpandedIndex(prev => prev === index ? false : index);
  };

  if (loading) {
    return <div className="text-white text-xl text-center p-10 font-mono">Loading Operating Principles...</div>;
  }

  return (
    <div className="bg-black/80 backdrop-blur-xl min-h-[90vh] md:max-h-[90vh] mt-20 md:mt-10 rounded-3xl p-4 md:p-10 text-white flex flex-col items-center overflow-y-auto border border-white/10 shadow-2xl isolate">
      <h1 className="text-2xl md:text-4xl font-bold mb-2 text-center tracking-tight">
        Invisible Enemies Operating Principles
      </h1>
      <p className="text-lg text-white/70 mb-8 font-mono tracking-widest text-center">
        Total Signers: {signerCount}
      </p>

      <div className="w-full max-w-[800px] flex flex-col gap-3">
        {principles.map((principle: { japaneseName: any; englishName: any; description: any; }, index: number) => {
          const isExpanded = expandedIndex === index;
          const colorClass = principleColors[index % principleColors.length];

          return (
            <div
              key={index}
              className={`rounded-xl border border-white/20 overflow-hidden transition-all duration-300 ${isExpanded ? colorClass : 'bg-white/5 hover:bg-white/10'}`}
            >
              <button
                onClick={() => handleAccordionChange(index)}
                className="w-full text-left p-4 flex items-center justify-between group"
              >
                <div className="flex flex-col">
                  <span className="text-lg font-semibold flex items-center gap-2">
                    {principle.japaneseName}
                    <span className="hidden sm:inline w-1 h-1 bg-white/50 rounded-full"></span>
                    <span className="text-white/90">{principle.englishName}</span>
                  </span>
                </div>
                {isExpanded ?
                  <ChevronUpIcon className="w-5 h-5 text-white/80" /> :
                  <ChevronDownIcon className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
                }
              </button>

              <div
                className={`transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="p-4 pt-0 text-white/90 leading-relaxed border-t border-white/10">
                  {principle.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!hasAccepted ? (
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 max-w-[600px] w-full text-center shadow-lg border border-white/20">
          <h2 className="text-xl md:text-2xl font-bold mb-4">Uphold Our Values</h2>
          <p className="text-white/80 mb-4 leading-relaxed">
            By signing, you commit to embodying and upholding our operating principles. Your dedication ensures that we maintain excellence, integrity, and a harmonious work environment.
          </p>
          <p className="text-white/80 mb-4">
            Please enter your name below to signify your acceptance and commitment.
          </p>
          <input
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="bg-white/20 backdrop-blur-sm text-white placeholder-white/40 border border-white/30 rounded-lg px-4 py-3 w-full max-w-sm mb-4 focus:outline-none focus:border-red-500 transition-colors"
          />
          <button
            onClick={handleAcceptPrinciples}
            className="bg-[#F54029] hover:bg-[#D03824] text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 w-full md:w-auto"
          >
            Sign Principles
          </button>
        </div>
      ) : (
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 max-w-[600px] w-full text-center shadow-lg border border-white/20">
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-green-400">
            Thank You for Signing!
          </h2>
          <p className="text-white/80 leading-relaxed">
            Your commitment to our operating principles strengthens our company&apos;s foundation and fosters a culture of excellence and integrity.
          </p>
        </div>
      )}
    </div>
  );
};

export default OperatingPrinciples;
