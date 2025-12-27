'use client';

import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import { Box, Typography, TextField, Button, Divider, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { base } from 'thirdweb/chains';
import { createThirdwebClient, getContract, readContract, prepareContractCall, sendAndConfirmTransaction } from 'thirdweb';
import { useActiveWallet } from 'thirdweb/react';
import { getDiamondAddress } from '../primitives/Diamond';

// Monochrome (black & white) console theme
const MONO_BG = '#000000';
const MONO_PANEL_BG = '#0A0A0A';
const MONO_TEXT = '#F5F5F5';
const MONO_DIM = '#CCCCCC';
const MONO_BORDER = '#FFFFFF';
const MONO_MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

const Card = styled(Box)(({ theme }) => ({
  borderRadius: 12,
  background: 'rgba(10,10,10,0.6)',
  border: `1px solid ${MONO_BORDER}`,
  boxShadow: '0 8px 20px rgba(255,255,255,0.08)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  padding: theme.spacing(2),
  color: MONO_TEXT,
  fontFamily: MONO_MONO,
  transformOrigin: 'center',
  willChange: 'transform',
}));

const Row = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  flexWrap: 'wrap',
  alignItems: 'center'
}));

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

async function getClient() {
  const resp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
  const { clientId } = await resp.json();
  if (!clientId) throw new Error('Thirdweb client is not configured');
  return createThirdwebClient({ clientId });
}

const Field = (props: any) => (
  <TextField
    {...props}
    size="small"
    InputLabelProps={{ sx: { color: MONO_DIM, fontFamily: MONO_MONO } }}
    inputProps={{ style: { fontFamily: MONO_MONO, caretColor: MONO_TEXT } }}
    sx={{
      minWidth: 260,
      flex: 1,
      '& .MuiOutlinedInput-root': {
        backgroundColor: '#0A0A0A',
        color: MONO_TEXT,
        fontFamily: MONO_MONO,
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: MONO_BORDER,
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: MONO_BORDER,
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: MONO_BORDER,
      },
      '& .MuiFormHelperText-root': {
        color: MONO_DIM,
        marginLeft: 0,
      },
    }}
  />
);

const NoirButton = (props: any) => (
  <Button
    {...props}
    variant={props.variant || 'outlined'}
    sx={{
      backgroundColor: props.variant === 'contained' ? MONO_TEXT : 'transparent',
      color: props.variant === 'contained' ? '#000' : MONO_TEXT,
      border: `1px solid ${MONO_BORDER}`,
      fontFamily: MONO_MONO,
      px: 2,
      py: 1,
      borderRadius: 2,
      letterSpacing: 1,
      textTransform: 'none',
      '&:hover': {
        backgroundColor: props.variant === 'contained' ? '#EAEAEA' : 'rgba(255,255,255,0.12)',
        borderColor: MONO_BORDER,
      },
      '&.Mui-disabled': {
        color: '#6E6E6E',
        borderColor: '#2E2E2E',
      },
    }}
  />
);

// Blinking caret for retro vibe
// Retro caret that can be positioned absolutely relative to active input
const Blink = styled('span')(({ theme }) => ({
  position: 'absolute',
  width: 2,
  height: '1.2em',
  backgroundColor: MONO_TEXT,
  animation: 'blink 1s steps(1, end) infinite',
  '@keyframes blink': {
    '0%': { opacity: 1 },
    '50%': { opacity: 0 },
    '100%': { opacity: 1 },
  },
}));

// Full-interface scanline overlay
const Scanlines = styled('div')(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 0,
  backgroundImage:
    'repeating-linear-gradient(180deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, rgba(0,0,0,0) 3px)',
  animation: 'scanMove 8s linear infinite',
  '@keyframes scanMove': {
    '0%': { backgroundPositionY: '0px' },
    '100%': { backgroundPositionY: '8px' },
  },
}));

// Minimal role ABI for access checks
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

export default function Blacklist() {
  const wallet = useActiveWallet()?.getAccount() as any;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [hasChiefRole, setHasChiefRole] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<string>('s1');

  // form state
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [reason, setReason] = useState('');
  const [previousOwner, setPreviousOwner] = useState('');
  const [suspiciousTxHash, setSuspiciousTxHash] = useState('');
  const [reissueAddress, setReissueAddress] = useState('');
  const [complaintId, setComplaintId] = useState('');
  const [checkAddr, setCheckAddr] = useState('');
  const [checkTokenId, setCheckTokenId] = useState('');

  const [readOutput, setReadOutput] = useState<any>(null);

  const runRead = async (method: string) => {
    try {
      setBusy(true);
      setMessage('');
      const client = await getClient();
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
      const client = await getClient();
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
      await sendAndConfirmTransaction({ transaction: tx, account: wallet });
      setMessage('Transaction confirmed');
    } catch (e: any) {
      const msg = String(e?.message || 'Write failed');
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  };

  // Role check for Step 9 (Admin)
  React.useEffect(() => {
    (async () => {
      try {
        if (!wallet) { setHasChiefRole(false); return; }
        const client = await getClient();
        const address = await getDiamondAddress();
        const contract = getContract({ client, chain: base, address, abi: roleAbi });
        const ok = await readContract({ contract, method: 'nftpdHasRole', params: ['ChiefOfPolice', wallet.address] });
        setHasChiefRole(Boolean(ok));
      } catch { setHasChiefRole(false); }
    })();
  }, [wallet]);

  return (
    <Box sx={{ position: 'absolute', inset: 0, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: MONO_BG }}>
      <Card sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 1 }}>
          <Typography variant="h6" sx={{ color: MONO_TEXT, fontFamily: MONO_MONO, fontWeight: 800 }}>
            NFTPD // BLACKLIST OPS CONSOLE
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <NoirButton onClick={() => setTutorialOpen(true)}>Tutorial</NoirButton>
            <NoirButton variant="contained" disabled={!wallet}>Connected {wallet ? 'YES' : 'NO'}</NoirButton>
          </Box>
        </Box>
      </Card>
      {/* Scanline overlay (desktop only to avoid mobile interference) */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Scanlines />
      </Box>

      {/* Three-column layout using Tailwind utilities for clarity */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        gap: { xs: 3, md: 2 },
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflowY: 'auto',
        p: { xs: 2, md: 0 },
        pb: 4
      }}>
        {/* Column 1: Instructions (small), Step 1 & 2 (medium) */}
        <Box sx={{ 
          display: { xs: 'contents', md: 'flex' },
          flexDirection: 'column',
          gap: 2,
          height: { md: '100%' },
          minHeight: 0
        }}>
          <Card onMouseEnter={() => setSelectedPanel('inst')} sx={{ display: 'flex', flexDirection: 'column', flexGrow: { md: 1 }, transition: 'all .2s ease', transform: { xs: 'none', md: (selectedPanel==='inst' ? 'scale(1.01)' : 'none') }, backgroundImage: { xs: 'none', md: selectedPanel==='inst' ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)' : undefined } }}>
            <Typography variant="subtitle1" sx={{ mb: 1.5, color: MONO_TEXT, fontFamily: MONO_MONO }}>Instructions</Typography>
            <Typography variant="body2" sx={{ color: MONO_DIM, fontFamily: MONO_MONO, lineHeight: 1.9 }}>
              Follow steps in order. Each panel represents a step. Complete inputs and press the action button where provided.
            </Typography>
          </Card>
          <Card onMouseEnter={() => setSelectedPanel('s1')} sx={{ display: 'flex', flexDirection: 'column', flexGrow: { md: (selectedPanel==='s1' ? 3 : 2) }, transition: 'all .2s ease', transform: { xs: 'none', md: (selectedPanel==='s1' ? 'scale(1.006)' : 'none') }, backgroundImage: { xs: 'none', md: selectedPanel==='s1' ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px)' : undefined }, outline: { xs: 'none', md: selectedPanel==='s1' ? `1px solid ${MONO_BORDER}` : 'none' } }}>
            <Typography variant="subtitle1" sx={{ mb: 1, color: MONO_TEXT, fontFamily: MONO_MONO }}>Step 1 — Inspect Asset</Typography>
            <Typography variant="caption" sx={{ color: MONO_DIM, mb: 1.5, fontFamily: MONO_MONO }}>
              Check address and token status before filing.
            </Typography>
      <Row>
              <Field onFocus={() => setSelectedPanel('s1')} label="Address" value={checkAddr} onChange={(e: any) => setCheckAddr(e.target.value)} helperText="0x-prefixed account or contract" />
              <NoirButton disabled={busy} onClick={() => runRead('isAddressBlacklisted')}>ADDRESS STATUS</NoirButton>
          </Row>
          <Row>
              <Field onFocus={() => setSelectedPanel('s1')} label="Token ID" value={checkTokenId} onChange={(e: any) => setCheckTokenId(e.target.value)} helperText="Numeric token id" />
              <NoirButton disabled={busy} onClick={() => runRead('checkIfTokenBlacklisted')}>CHECK BLACKLIST</NoirButton>
              <NoirButton disabled={busy} onClick={() => runRead('isTokenUnderInvestigation')}>INVESTIGATION?</NoirButton>
          </Row>
          {readOutput !== null && (
            <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ color: MONO_DIM, fontFamily: MONO_MONO }}>Output</Typography>
                <Card sx={{ mt: 1, backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)', transform: 'perspective(600px) scale(1.004)', transition: 'transform .2s ease', border: `1px solid ${MONO_BORDER}` }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: MONO_TEXT, fontFamily: MONO_MONO }}>{typeof readOutput === 'object' ? JSON.stringify(readOutput, null, 2) : String(readOutput)}</Typography>
              </Card>
            </Box>
          )}
        </Card>
          <Card onMouseEnter={() => setSelectedPanel('s2')} sx={{ display: 'flex', flexDirection: 'column', flexGrow: { md: (selectedPanel==='s2' ? 3 : 2) }, transition: 'all .2s ease', transform: { xs: 'none', md: (selectedPanel==='s2' ? 'scale(1.006)' : 'none') }, backgroundImage: { xs: 'none', md: selectedPanel==='s2' ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px)' : undefined }, outline: { xs: 'none', md: selectedPanel==='s2' ? `1px solid ${MONO_BORDER}` : 'none' } }}>
            <Typography variant="subtitle1" sx={{ mb: 1, color: MONO_TEXT, fontFamily: MONO_MONO }}>Step 2 — Contract Address</Typography>
            <Typography variant="caption" sx={{ color: MONO_DIM, fontFamily: MONO_MONO }}>ERC721/1155 collection address (0x...)</Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Field onFocus={() => setSelectedPanel('s2')} label="Contract Address" value={contractAddress} onChange={(e: any) => setContractAddress(e.target.value)} helperText="Paste the full address" />
            </Box>
          </Card>
        </Box>

        {/* Column 2: Steps 3–6 (small) */}
        <Box sx={{ 
          display: { xs: 'contents', md: 'flex' },
          flexDirection: 'column',
          gap: 2,
          height: { md: '100%' },
          minHeight: 0
        }}>
          <Card onMouseEnter={() => setSelectedPanel('s3')} sx={{ display: 'flex', flexDirection: 'column', flexGrow: { md: (selectedPanel==='s3' ? 2 : 1) }, transition: 'all .2s ease', transform: { xs: 'none', md: (selectedPanel==='s3' ? 'scale(1.006)' : 'none') }, backgroundImage: { xs: 'none', md: selectedPanel==='s3' ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)' : undefined }, outline: { xs: 'none', md: selectedPanel==='s3' ? `1px solid ${MONO_BORDER}` : 'none' } }}>
            <Typography variant="subtitle1" sx={{ mb: 1, color: MONO_TEXT, fontFamily: MONO_MONO }}>Step 3 — Token ID</Typography>
            <Typography variant="caption" sx={{ color: MONO_DIM, fontFamily: MONO_MONO }}>Numeric identifier of the affected token</Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Field onFocus={() => setSelectedPanel('s3')} label="Token ID" value={tokenId} onChange={(e: any) => setTokenId(e.target.value)} helperText="Numbers only" />
            </Box>
          </Card>
          <Card onMouseEnter={() => setSelectedPanel('s4')} sx={{ display: 'flex', flexDirection: 'column', flexGrow: { md: (selectedPanel==='s4' ? 2 : 1) }, transition: 'all .2s ease', transform: { xs: 'none', md: (selectedPanel==='s4' ? 'scale(1.006)' : 'none') }, backgroundImage: { xs: 'none', md: selectedPanel==='s4' ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)' : undefined }, outline: { xs: 'none', md: selectedPanel==='s4' ? `1px solid ${MONO_BORDER}` : 'none' } }}>
            <Typography variant="subtitle1" sx={{ mb: 1, color: MONO_TEXT, fontFamily: MONO_MONO }}>Step 4 — Reason</Typography>
            <Typography variant="caption" sx={{ color: MONO_DIM, fontFamily: MONO_MONO }}>Brief description of the issue</Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Field onFocus={() => setSelectedPanel('s4')} label="Reason" value={reason} onChange={(e: any) => setReason(e.target.value)} helperText="Keep it concise and factual" />
            </Box>
          </Card>
          <Card onMouseEnter={() => setSelectedPanel('s5')} sx={{ display: 'flex', flexDirection: 'column', flexGrow: { md: (selectedPanel==='s5' ? 2 : 1) }, transition: 'all .2s ease', transform: { xs: 'none', md: (selectedPanel==='s5' ? 'scale(1.006)' : 'none') }, backgroundImage: { xs: 'none', md: selectedPanel==='s5' ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)' : undefined }, outline: { xs: 'none', md: selectedPanel==='s5' ? `1px solid ${MONO_BORDER}` : 'none' } }}>
            <Typography variant="subtitle1" sx={{ mb: 1, color: MONO_TEXT, fontFamily: MONO_MONO }}>Step 5 — Previous Owner</Typography>
            <Typography variant="caption" sx={{ color: MONO_DIM, fontFamily: MONO_MONO }}>Address believed to have exploited/held token</Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Field onFocus={() => setSelectedPanel('s5')} label="Previous Owner" value={previousOwner} onChange={(e: any) => setPreviousOwner(e.target.value)} helperText="0x-prefixed address" />
            </Box>
          </Card>
          <Card onMouseEnter={() => setSelectedPanel('s6')} sx={{ display: 'flex', flexDirection: 'column', flexGrow: { md: (selectedPanel==='s6' ? 2 : 1) }, transition: 'all .2s ease', transform: { xs: 'none', md: (selectedPanel==='s6' ? 'scale(1.006)' : 'none') }, backgroundImage: { xs: 'none', md: selectedPanel==='s6' ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)' : undefined }, outline: { xs: 'none', md: selectedPanel==='s6' ? `1px solid ${MONO_BORDER}` : 'none' } }}>
            <Typography variant="subtitle1" sx={{ mb: 1, color: MONO_TEXT, fontFamily: MONO_MONO }}>Step 6 — Suspicious Tx Hash</Typography>
            <Typography variant="caption" sx={{ color: MONO_DIM, fontFamily: MONO_MONO }}>32-byte transaction hash of the incident</Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Field onFocus={() => setSelectedPanel('s6')} label="Suspicious Tx Hash (0x...)" value={suspiciousTxHash} onChange={(e: any) => setSuspiciousTxHash(e.target.value)} helperText="Paste full 0x hash" />
            </Box>
          </Card>
        </Box>

        {/* Column 3: Step 7 (critical), Step 8 (execute), Step 9 (admin gated) */}
        <Box sx={{ 
          display: { xs: 'contents', md: 'flex' },
          flexDirection: 'column',
          gap: 2,
          height: { md: '100%' },
          minHeight: 0
        }}>
          <Card onMouseEnter={() => setSelectedPanel('s7')} sx={{ borderStyle: 'dashed', borderWidth: 2, position: 'relative', display: 'flex', flexDirection: 'column', flexGrow: { md: (selectedPanel==='s7' ? 2 : 1) }, transition: 'all .2s ease', transform: { xs: 'none', md: (selectedPanel==='s7' ? 'scale(1.006)' : 'none') }, backgroundImage: { xs: 'none', md: selectedPanel==='s7' ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)' : undefined }, outline: { xs: 'none', md: selectedPanel==='s7' ? `1px solid ${MONO_BORDER}` : 'none' } }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, px: 1, py: 0.5, border: '1px solid', borderColor: MONO_BORDER, backgroundColor: MONO_TEXT, color: '#000', fontFamily: MONO_MONO, fontSize: 12, letterSpacing: 1 }}>CRITICAL</Box>
            <Typography variant="subtitle1" sx={{ mb: 1, color: MONO_TEXT, fontFamily: MONO_MONO }}>Step 7 — Reissue Address</Typography>
            <Typography variant="caption" sx={{ color: MONO_DIM, fontFamily: MONO_MONO }}>Address to receive replacement token</Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Field onFocus={() => setSelectedPanel('s7')} label="Reissue Address" value={reissueAddress} onChange={(e: any) => setReissueAddress(e.target.value)} helperText="0x-prefixed address" />
            </Box>
          </Card>
          <Card onMouseEnter={() => setSelectedPanel('s8')} sx={{ display: 'flex', flexDirection: 'column', flexGrow: { md: (selectedPanel==='s8' ? 2 : 1) }, transition: 'all .2s ease', transform: { xs: 'none', md: (selectedPanel==='s8' ? 'scale(1.006)' : 'none') }, backgroundImage: { xs: 'none', md: selectedPanel==='s8' ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)' : undefined }, outline: { xs: 'none', md: selectedPanel==='s8' ? `1px solid ${MONO_BORDER}` : 'none' } }}>
            <Typography variant="subtitle1" sx={{ mb: 1, color: MONO_TEXT, fontFamily: MONO_MONO }}>Step 8 — Execute</Typography>
            <Typography variant="caption" sx={{ color: MONO_DIM, mb: 1.5, fontFamily: MONO_MONO }}>Submit or perform administrative actions</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Tooltip title={!wallet ? 'Connect wallet' : ''}>
              <span>
                  <NoirButton disabled={!wallet || busy} onClick={() => runWrite('fileComplaint')} variant="contained">FILE COMPLAINT</NoirButton>
              </span>
            </Tooltip>
            </Box>
          </Card>
          <Card onMouseEnter={() => setSelectedPanel('s9')} sx={{ opacity: hasChiefRole ? 1 : 0.5, display: 'flex', flexDirection: 'column', flexGrow: { md: (selectedPanel==='s9' ? 2 : 1) }, transition: 'all .2s ease', transform: { xs: 'none', md: (selectedPanel==='s9' ? 'scale(1.006)' : 'none') }, backgroundImage: { xs: 'none', md: selectedPanel==='s9' ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)' : undefined }, outline: { xs: 'none', md: selectedPanel==='s9' ? `1px solid ${MONO_BORDER}` : 'none' } }}>
            <Typography variant="subtitle1" sx={{ mb: 1, color: MONO_TEXT, fontFamily: MONO_MONO }}>Step 9 — Admin (ChiefOfPolice)</Typography>
            <Typography variant="caption" sx={{ color: MONO_DIM, fontFamily: MONO_MONO }}>{hasChiefRole ? 'Authorized' : 'Restricted: ChiefOfPolice role required'}</Typography>
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <NoirButton disabled={!hasChiefRole || busy} onClick={() => runWrite('removeTokenFromBlacklist')}>REMOVE FROM BLACKLIST</NoirButton>
              <NoirButton disabled={!hasChiefRole || busy} onClick={() => runWrite('syncBlacklistData')}>SYNC BLACKLIST DATA</NoirButton>
            </Box>
        </Card>
        </Box>
      </Box>

      {message && (
        <Card>
          <Typography variant="body2" sx={{ color: MONO_TEXT, fontFamily: MONO_MONO }}>SYSTEM: {message}</Typography>
        </Card>
      )}

      {/* Tutorial Dialog */}
      <Dialog open={tutorialOpen} onClose={() => setTutorialOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { backgroundColor: MONO_PANEL_BG, border: `1px solid ${MONO_BORDER}` } }}>
        <DialogTitle sx={{ color: MONO_TEXT, fontFamily: MONO_MONO }}>How to use the Blacklist Ops Console<Blink /></DialogTitle>
        <DialogContent dividers sx={{ borderColor: MONO_BORDER }}>
          {[
            {
              title: 'Overview',
              body: 'Use Read to inspect status. Use Write to file complaints or remove tokens. All inputs are high-contrast and labeled. Fields accept plain text except IDs and hashes which must be numeric or hex.'
            },
            {
              title: 'File a Complaint',
              body: 'Provide Contract Address (ERC721/1155), Token ID (number), Reason (plain text), Previous Owner (address suspected), Suspicious Tx Hash (0x-prefixed 32-byte hash), and Reissue Address (new owner to receive a replacement). Then press fileComplaint.'
            },
            {
              title: 'Check Status',
              body: 'Use Complaint ID to fetch details or status. Use Address/Token ID to check if an address or token is blacklisted or under investigation.'
            },
            {
              title: 'Remove from Blacklist',
              body: 'Enter Token ID and select removeTokenFromBlacklist. This requires proper permissions on-chain.'
            },
            {
              title: 'Sync',
              body: 'syncBlacklistData triggers an on-chain sync with off-chain sources if supported by the contract.'
            }
          ].map((step, idx) => (
            <Box key={idx} sx={{ display: idx === tutorialStep ? 'block' : 'none' }}>
              <Typography variant="h6" sx={{ color: MONO_TEXT, fontFamily: MONO_MONO, mb: 1 }}>{idx + 1}. {step.title}</Typography>
              <Typography variant="body2" sx={{ color: MONO_DIM, fontFamily: MONO_MONO, lineHeight: 1.8 }}>{step.body}</Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <NoirButton onClick={() => setTutorialOpen(false)}>Close</NoirButton>
          <Box sx={{ flex: 1 }} />
          <NoirButton onClick={() => setTutorialStep((s: number) => Math.max(0, s - 1))} disabled={tutorialStep === 0}>Back</NoirButton>
          <NoirButton variant="contained" onClick={() => setTutorialStep((s: number) => Math.min(4, s + 1))}>
            {tutorialStep < 4 ? 'Next' : 'Done'}
          </NoirButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


