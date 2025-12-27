'use client';

import React, { useState, useEffect } from 'react';
import { base } from 'thirdweb/chains';
import { createThirdwebClient, getContract, readContract, prepareContractCall, sendAndConfirmTransaction } from 'thirdweb';
import { useActiveWallet } from 'thirdweb/react';
import { getDiamondAddress } from '../primitives/Diamond';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// Monochrome theme constants mapped to Tailwind classes
// Background: bg-black
// Panel: bg-neutral-950
// Text: text-gray-100
// Border: border-white/20

const blacklistAbi: any = [
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "address", "name": "contractAddress", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "ComplaintLogged", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "string", "name": "message", "type": "string" }, { "indexed": false, "internalType": "address", "name": "utilityCoDiamond", "type": "address" }, { "indexed": false, "internalType": "address", "name": "contractAddress", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "DebugLog", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "indexed": false, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": false, "internalType": "address", "name": "newOwner", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "complaintId", "type": "uint256" }], "name": "TokenReissued", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "TokenRemovedFromBlacklist", "type": "event" },
  { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "checkIfTokenBlacklisted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "contractAddress", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "string", "name": "reason", "type": "string" }, { "internalType": "address", "name": "previousOwner", "type": "address" }, { "internalType": "bytes32", "name": "suspiciousTxHash", "type": "bytes32" }, { "internalType": "address", "name": "reissueAddress", "type": "address" }], "name": "fileComplaint", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "complaintId", "type": "uint256" }], "name": "getComplaintDetails", "outputs": [{ "components": [{ "internalType": "address", "name": "contractAddress", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "string", "name": "reason", "type": "string" }, { "internalType": "address", "name": "previousOwner", "type": "address" }, { "internalType": "bytes32", "name": "suspiciousTxHash", "type": "bytes32" }, { "internalType": "address", "name": "reissueAddress", "type": "address" }, { "internalType": "uint8", "name": "state", "type": "uint8" }], "internalType": "struct IOsirisBlacklistStorage.Complaint", "name": "", "type": "tuple" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "complaintId", "type": "uint256" }], "name": "getComplaintStatus", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }], "name": "isAddressBlacklisted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "isTokenBlacklisted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "isTokenUnderInvestigation", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "removeTokenFromBlacklist", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "syncBlacklistData", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

const roleAbi: any = [
  {
    inputs: [
      { internalType: 'string', name: 'role', type: 'string' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'nftpdHasRole',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const Scanlines = () => (
  <div className="absolute inset-0 pointer-events-none z-0 opacity-10" style={{
    backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0) 0, rgba(255,255,255,0) 1px, rgba(0,0,0,0.5) 2px)',
    backgroundSize: '100% 4px'
  }} />
);

const Card = ({ children, className = '', onClick, onMouseEnter }: any) => (
  <div
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    className={`bg-black/40 backdrop-blur-md border border-white/20 p-4 rounded-xl shadow-lg text-gray-100 font-mono transition-all duration-200 ${className}`}
  >
    {children}
  </div>
);

const Field = ({ label, value, onChange, helperText, placeholder }: any) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-xs text-gray-400 font-mono uppercase tracking-wide">{label}</label>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="bg-black/80 border border-white/20 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white/60 transition-colors"
    />
    {helperText && <span className="text-[10px] text-gray-500 font-mono">{helperText}</span>}
  </div>
);

const Button = ({ children, onClick, disabled, variant = 'outlined', className = '' }: any) => {
  const baseStyle = "px-4 py-2 font-mono text-xs uppercase tracking-wider rounded transition-all duration-200 flex items-center justify-center";
  const variants = {
    outlined: "border border-white/20 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed",
    contained: "bg-white text-black hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {children}
    </button>
  );
};

export default function Blacklist() {
  const wallet = useActiveWallet()?.getAccount();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hasChiefRole, setHasChiefRole] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<string>('s1');

  // Form state
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [reason, setReason] = useState('');
  const [previousOwner, setPreviousOwner] = useState('');
  const [suspiciousTxHash, setSuspiciousTxHash] = useState('');
  const [reissueAddress, setReissueAddress] = useState('');
  const [complaintId, setComplaintId] = useState(''); // Keep variable, even if unused in current view
  const [checkAddr, setCheckAddr] = useState('');
  const [checkTokenId, setCheckTokenId] = useState('');

  const [readOutput, setReadOutput] = useState<any>(null);

  const getClient = () => {
    const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT;
    if (!clientId) throw new Error("Client ID not configured");
    return createThirdwebClient({ clientId });
  };

  const runRead = async (method: string) => {
    try {
      setBusy(true);
      setMessage('');
      const client = getClient();
      const address = await getDiamondAddress();
      const contract = getContract({ client, chain: base, address, abi: blacklistAbi });
      let params: any[] = [];
      switch (method) {
        case 'checkIfTokenBlacklisted': params = [BigInt(checkTokenId || '0')]; break;
        case 'getComplaintDetails': params = [BigInt(complaintId || '0')]; break;
        case 'getComplaintStatus': params = [BigInt(complaintId || '0')]; break;
        case 'isAddressBlacklisted': params = [checkAddr]; break;
        case 'isTokenBlacklisted': params = [BigInt(checkTokenId || '0')]; break;
        case 'isTokenUnderInvestigation': params = [BigInt(checkTokenId || '0')]; break;
      }
      const result = await readContract({ contract, method, params });
      setReadOutput(result);
    } catch (e: any) {
      setMessage(e?.message || 'Read failed');
    } finally {
      setBusy(false);
    }
  };

  const runWrite = async (method: string) => {
    try {
      if (!wallet) { setMessage('Connect wallet to write'); return; }
      setBusy(true);
      setMessage('');
      const client = getClient();
      const address = await getDiamondAddress();
      const contract = getContract({ client, chain: base, address, abi: blacklistAbi });
      let params: any[] = [];
      switch (method) {
        case 'fileComplaint':
          params = [contractAddress, BigInt(tokenId || '0'), reason, previousOwner, suspiciousTxHash as any, reissueAddress];
          break;
        case 'removeTokenFromBlacklist':
          params = [BigInt(tokenId || '0')];
          break;
        case 'syncBlacklistData':
          params = [];
          break;
      }
      const tx = await prepareContractCall({ contract, method, params, value: BigInt(0) });
      await sendAndConfirmTransaction({ transaction: tx, account: wallet as any }); // Cast wallet to any to avoid type issues with thirdweb react
      setMessage('Transaction confirmed');
    } catch (e: any) {
      const msg = String(e?.message || 'Write failed');
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  };

  // Role check
  useEffect(() => {
    (async () => {
      try {
        if (!wallet) { setHasChiefRole(false); return; }
        const client = getClient();
        const address = await getDiamondAddress();
        const contract = getContract({ client, chain: base, address, abi: roleAbi });
        const ok = await readContract({ contract, method: 'nftpdHasRole', params: ['ChiefOfPolice', wallet.address] });
        setHasChiefRole(Boolean(ok));
      } catch { setHasChiefRole(false); }
    })();
  }, [wallet]);

  return (
    <div className="absolute inset-0 p-4 md:p-6 flex flex-col gap-4 bg-black overflow-hidden select-none isolate">
      {/* Header */}
      <Card className="flex items-center justify-between shrink-0 z-10">
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-tighter text-white">NFTPD // BLACKLIST OPS CONSOLE</h1>
          <span className="text-[10px] text-gray-500 font-mono tracking-widest mt-0.5">V.2.0.4 // TERMINAL ACCESS</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTutorialOpen(true)}>Tutorial</Button>
          <Button variant="contained" disabled={!wallet}>
            {wallet ? 'CONNECTED' : 'DISCONNECTED'}
          </Button>
        </div>
      </Card>

      <Scanlines />

      {/* Main Grid Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 overflow-y-auto pb-4 z-10 custom-scrollbar pr-2">
        {/* Column 1 */}
        <div className="flex flex-col gap-4">
          <Card
            onMouseEnter={() => setSelectedPanel('inst')}
            className={`flex-col gap-2 transition-transform ${selectedPanel === 'inst' ? 'scale-[1.02] border-white/40' : ''}`}
          >
            <h3 className="text-sm font-bold text-white uppercase mb-2 border-b border-white/10 pb-1">Instructions</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Follow steps in order. Each panel represents a step. Complete inputs and press the action button where provided.
            </p>
          </Card>

          <Card
            onMouseEnter={() => setSelectedPanel('s1')}
            className={`flex-grow flex flex-col gap-4 transition-transform ${selectedPanel === 's1' ? 'scale-[1.02] border-white/40' : ''}`}
          >
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase">Step 1 — Consoles</h3>
              <p className="text-xs text-gray-500">Inspect status before action.</p>
            </div>

            <div className="flex gap-2 items-end">
              <Field label="Address" value={checkAddr} onChange={(e: any) => setCheckAddr(e.target.value)} placeholder="0x..." />
              <Button disabled={busy} onClick={() => runRead('isAddressBlacklisted')}>STATUS</Button>
            </div>

            <div className="flex flex-col gap-2">
              <Field label="Token ID" value={checkTokenId} onChange={(e: any) => setCheckTokenId(e.target.value)} placeholder="ID" />
              <div className="grid grid-cols-2 gap-2">
                <Button disabled={busy} onClick={() => runRead('checkIfTokenBlacklisted')} className="w-full">CHECK</Button>
                <Button disabled={busy} onClick={() => runRead('isTokenUnderInvestigation')} className="w-full">INVESTIGATE</Button>
              </div>
            </div>

            {readOutput !== null && (
              <div className="mt-2 bg-black/40 p-2 rounded border border-white/10 text-[10px] font-mono text-green-400 overflow-x-auto">
                <pre>{typeof readOutput === 'object' ? JSON.stringify(readOutput, null, 2) : String(readOutput)}</pre>
              </div>
            )}
          </Card>

          <Card
            onMouseEnter={() => setSelectedPanel('s2')}
            className={`transition-transform ${selectedPanel === 's2' ? 'scale-[1.02] border-white/40' : ''}`}
          >
            <div className="space-y-1 mb-2">
              <h3 className="text-sm font-bold text-white uppercase">Step 2 — Contract</h3>
              <p className="text-xs text-gray-500">Target collection address.</p>
            </div>
            <Field value={contractAddress} onChange={(e: any) => setContractAddress(e.target.value)} placeholder="0x..." />
          </Card>
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-4">
          <Card onMouseEnter={() => setSelectedPanel('s3')} className={selectedPanel === 's3' ? 'scale-[1.02] border-white/40' : ''}>
            <div className="space-y-1 mb-2">
              <h3 className="text-sm font-bold text-white uppercase">Step 3 — Token ID</h3>
            </div>
            <Field value={tokenId} onChange={(e: any) => setTokenId(e.target.value)} placeholder="Numeric ID" />
          </Card>

          <Card onMouseEnter={() => setSelectedPanel('s4')} className={selectedPanel === 's4' ? 'scale-[1.02] border-white/40' : ''}>
            <div className="space-y-1 mb-2">
              <h3 className="text-sm font-bold text-white uppercase">Step 4 — Reason</h3>
            </div>
            <Field value={reason} onChange={(e: any) => setReason(e.target.value)} placeholder="Concise description" />
          </Card>

          <Card onMouseEnter={() => setSelectedPanel('s5')} className={selectedPanel === 's5' ? 'scale-[1.02] border-white/40' : ''}>
            <div className="space-y-1 mb-2">
              <h3 className="text-sm font-bold text-white uppercase">Step 5 — Prev. Owner</h3>
            </div>
            <Field value={previousOwner} onChange={(e: any) => setPreviousOwner(e.target.value)} placeholder="Suspect address" />
          </Card>

          <Card onMouseEnter={() => setSelectedPanel('s6')} className={selectedPanel === 's6' ? 'scale-[1.02] border-white/40' : ''}>
            <div className="space-y-1 mb-2">
              <h3 className="text-sm font-bold text-white uppercase">Step 6 — Tx Hash</h3>
            </div>
            <Field value={suspiciousTxHash} onChange={(e: any) => setSuspiciousTxHash(e.target.value)} placeholder="0x..." />
          </Card>
        </div>

        {/* Column 3 */}
        <div className="flex flex-col gap-4">
          <Card
            onMouseEnter={() => setSelectedPanel('s7')}
            className={`border-dashed border-2 relative ${selectedPanel === 's7' ? 'scale-[1.02] border-red-500/50' : ''}`}
          >
            <div className="absolute top-2 right-2 px-1 border border-white/50 text-[10px] bg-white text-black font-bold uppercase">CRITICAL</div>
            <div className="space-y-1 mb-2">
              <h3 className="text-sm font-bold text-white uppercase">Step 7 — Reissue To</h3>
              <p className="text-xs text-gray-500">Recipient of replacement.</p>
            </div>
            <Field value={reissueAddress} onChange={(e: any) => setReissueAddress(e.target.value)} placeholder="0x..." />
          </Card>

          <Card onMouseEnter={() => setSelectedPanel('s8')} className={`flex-grow ${selectedPanel === 's8' ? 'scale-[1.02] border-white/40' : ''}`}>
            <div className="space-y-1 mb-4">
              <h3 className="text-sm font-bold text-white uppercase">Step 8 — Execute</h3>
              <p className="text-xs text-gray-500">Commit action to blockchain.</p>
            </div>
            <Button disabled={!wallet || busy} onClick={() => runWrite('fileComplaint')} variant="contained" className="w-full py-4 text-sm font-bold">
              FILE COMPLAINT
            </Button>
          </Card>

          <Card onMouseEnter={() => setSelectedPanel('s9')} className={`opacity-${hasChiefRole ? '100' : '50'} ${selectedPanel === 's9' ? 'scale-[1.02] border-white/40' : ''}`}>
            <div className="space-y-1 mb-4">
              <h3 className="text-sm font-bold text-white uppercase">Step 9 — Admin</h3>
              <p className="text-xs text-gray-500">{hasChiefRole ? 'Access Granted' : 'Restricted Access'}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button disabled={!hasChiefRole || busy} onClick={() => runWrite('removeTokenFromBlacklist')}>REMOVE FROM BLACKLIST</Button>
              <Button disabled={!hasChiefRole || busy} onClick={() => runWrite('syncBlacklistData')}>SYNC DATA</Button>
            </div>
          </Card>
        </div>
      </div>

      {/* System Message Log */}
      {message && (
        <div className="absolute bottom-6 left-6 right-6 z-50">
          <Card className="bg-neutral-900 border-l-4 border-l-white">
            <p className="text-xs text-white font-mono">SYSTEM_LOG &gt; {message}</p>
          </Card>
        </div>
      )}

      {/* Tutorial Modal */}
      {tutorialOpen && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full bg-black border-2 border-white">
            <div className="flex justify-between items-center border-b border-white/20 pb-4 mb-4">
              <h2 className="text-xl font-bold uppercase">Console Manual</h2>
              <button onClick={() => setTutorialOpen(false)}><XMarkIcon className="w-6 h-6" /></button>
            </div>

            <div className="min-h-[120px] mb-8">
              {[
                { title: 'Overview', body: 'Use Read to inspect status. Write to file complaints. All inputs are numeric or hex where specified.' },
                { title: 'File Complaint', body: 'Fill Steps 2-7. Requires Contract Address, Token ID, Reason, suspected Owner, Tx Hash, and Reissue Address.' },
                { title: 'Check Status', body: 'Use Step 1. Enter Address or Token ID to verified blocked status.' },
                { title: 'Admin', body: 'Step 9 is restricted to ChiefOfPolice role for removing tokens or syncing data.' }
              ].map((step, idx) => (
                <div key={idx} className={idx === tutorialStep ? 'block animate-in fade-in duration-300' : 'hidden'}>
                  <h3 className="text-lg font-bold mb-2 text-white">{idx + 1}. {step.title}</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{step.body}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-white/20">
              <Button onClick={() => setTutorialStep(s => Math.max(0, s - 1))} disabled={tutorialStep === 0}>
                <ChevronLeftIcon className="w-4 h-4 mr-1" /> Back
              </Button>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i === tutorialStep ? 'bg-white' : 'bg-gray-700'}`} />
                ))}
              </div>
              <Button onClick={() => setTutorialStep(s => Math.min(3, s + 1))}>
                {tutorialStep < 3 ? 'Next' : 'Done'} <ChevronRightIcon className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
