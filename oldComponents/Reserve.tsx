"use client";
// Reserve.tsx

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Box,
  useMediaQuery,
  useTheme,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Card,
  CardContent,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Update as UpdateIcon,
  AccountBalanceWallet as WalletIcon,
  Sync as SyncIcon,
  AttachMoney as AttachMoneyIcon,
  MoneyOff as MoneyOffIcon,
  Send as SendIcon,
  DeleteForever as DeleteForeverIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import { TransactionButton, darkTheme, useActiveAccount, useActiveWallet, CheckoutWidget } from 'thirdweb/react';
import { getContract as getTwContract, prepareContractCall as prepareTwCall, prepareTransaction } from 'thirdweb';
import {
  getContract,
  readContract,
  prepareContractCall,
  sendAndConfirmTransaction,
} from 'thirdweb';
import { base } from 'thirdweb/chains';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ethers, formatEther, parseEther, parseUnits } from 'ethers';
import axios from 'axios';
import { getDiamondAddress } from '../primitives/Diamond';
import { createThirdwebClient } from 'thirdweb';

// Initialize the client in-browser from server-provided clientId
const clientPromise = (async () => {
  try {
    const r = await fetch('/api/thirdweb/client', { cache: 'no-store' });
    const j = await r.json();
    if (j?.clientId) return createThirdwebClient({ clientId: j.clientId });
  } catch {}
  return null;
})();

// Contract Address
let contractAddressPromise: Promise<string> | null = null;
const getContractAddress = async () => {
  if (!contractAddressPromise) contractAddressPromise = getDiamondAddress();
  return contractAddressPromise;
};

// ABI
const abi: any = [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"subsidiaryAddress","type":"address"}],"name":"BeneficiariesSynced","type":"event"},{"anonymous":false,"inputs":[],"name":"BeneficiariesWiped","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beneficiaryAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"split","type":"uint256"},{"indexed":false,"internalType":"string","name":"role","type":"string"}],"name":"BeneficiaryAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beneficiaryAddress","type":"address"}],"name":"BeneficiaryRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beneficiaryAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"split","type":"uint256"},{"indexed":false,"internalType":"string","name":"role","type":"string"}],"name":"BeneficiaryUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"string","name":"note","type":"string"}],"name":"FundsDeposited","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"percentage","type":"uint256"},{"indexed":false,"internalType":"string","name":"note","type":"string"}],"name":"FundsSentToUtilityCoDiamond","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newPercentage","type":"uint256"}],"name":"ReserveWithdrawalPercentageUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Withdrawal","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newInterval","type":"uint256"}],"name":"WithdrawalIntervalUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newLimit","type":"uint256"}],"name":"WithdrawalLimitUpdated","type":"event"},{"inputs":[{"internalType":"address","name":"beneficiaryAddress","type":"address"},{"internalType":"uint256","name":"split","type":"uint256"},{"internalType":"string","name":"role","type":"string"}],"name":"addBeneficiary","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"note","type":"string"}],"name":"depositFunds","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"getBeneficiaries","outputs":[{"components":[{"internalType":"address","name":"beneficiaryAddress","type":"address"},{"internalType":"uint256","name":"split","type":"uint256"},{"internalType":"string","name":"role","type":"string"}],"internalType":"struct InvisibleEnemiesReserve.Beneficiary[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pullBeneficiariesFromUtilityCoDiamond","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"removeBeneficiaryByIndex","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"string","name":"note","type":"string"}],"name":"sendFundsToUtilityCoDiamond","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newPercentage","type":"uint256"}],"name":"setReserveWithdrawalPercentage","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newInterval","type":"uint256"}],"name":"setWithdrawalInterval","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newLimit","type":"uint256"}],"name":"setWithdrawalLimit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"updateAndSyncBeneficiaries","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"beneficiaryAddress","type":"address"},{"internalType":"uint256","name":"split","type":"uint256"},{"internalType":"string","name":"role","type":"string"}],"name":"updateBeneficiary","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"wipeBeneficiaries","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"role","type":"string"},{"internalType":"address","name":"account","type":"address"}],"name":"ieHasRole","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}] as const;

// Role Definition
const CHIEF_OF_POLICE_ROLE = 'Commander';

// MUI Theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#FFFFFF' },
    secondary: {
      main: '#FFF',
    },
    background: {
      default: 'rgba(10, 10, 10, 0.65)',
      paper: 'rgba(18, 18, 18, 0.85)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#E0E0E0',
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
  },
});

// Styled Components
const MainContainer = styled(Box)(({ theme }) => ({
  height: '96vh',
  overflowY: 'auto',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  background: 'linear-gradient(180deg, rgba(7,7,7,0.65), rgba(20,20,20,0.55))',
}));

const StyledContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

const StyledCard = styled(Card)(({ theme }) => ({
  width: '100%',
  maxWidth: 1200,
  marginTop: theme.spacing(4),
  borderRadius: 16,
  boxShadow: '0 8px 40px rgba(255, 255, 255, 0.1)',
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.18)',
  backdropFilter: 'blur(10px)',
  backgroundColor: theme.palette.background.paper,
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: 999,
  textTransform: 'none',
  padding: theme.spacing(1.25, 3),
  color: theme.palette.text.primary,
  border: '1px solid rgba(255,255,255,0.35)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))',
  boxShadow: '0 8px 24px rgba(255,255,255,0.12)'
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  color: theme.palette.text.secondary,
  borderBottom: '1px solid rgba(255,255,255,0.18)'
}));

const StyledTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
}));

const COLORS = ['#ffffff', '#e6e6e6', '#cccccc', '#b3b3b3', '#999999', '#808080', '#666666', '#4d4d4d'];
// Token display symbols
const TOKEN_SYMBOLS = { ETH: 'Ξ', USDC: 'USDC', CBBTC: '₿' } as const;

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const { timestamp, balance, percentageChange } = data;

    return (
      <div
        style={{
          backgroundColor: '#222',
          padding: '10px',
          borderRadius: '8px',
          color: '#fff',
          boxShadow: '0 0 10px rgba(0,0,0,0.5)',
        }}
      >
        <p style={{ margin: 0, fontWeight: 'bold' }}>{timestamp}</p>
        <p style={{ margin: '5px 0' }}>Balance: {balance} ETH</p>
        {typeof percentageChange === 'number' && (
          <p
            style={{
              margin: 0,
              color: percentageChange >= 0 ? 'green' : 'red',
            }}
          >
            Change: {Number(percentageChange).toFixed(2)}%
          </p>
        )}
      </div>
    );
  }

  return null;
};

// Reserve Component
const Reserve = () => {
  // State variables
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [lastTransactions, setLastTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(true);
  const [isChief, setIsChief] = useState<boolean>(false);
  const [openAddBeneficiary, setOpenAddBeneficiary] = useState<boolean>(false);
  const [newBeneficiary, setNewBeneficiary] = useState<{ address: string; split: number; role: string }>({
    address: '',
    split: 0,
    role: '',
  });
  const [openUpdateBeneficiary, setOpenUpdateBeneficiary] = useState<boolean>(false);
  const [currentBeneficiary, setCurrentBeneficiary] = useState<{
    index: number;
    address: string;
    split: number;
    role: string;
  }>({ index: 0, address: '', split: 0, role: '' });

  // State variables for write functions
  const [openWriteFunctionDialog, setOpenWriteFunctionDialog] = useState<boolean>(false);
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionInputs, setFunctionInputs] = useState<any>({});

  // State variable for balance history
  const [balanceHistory, setBalanceHistory] = useState<any[]>([]);
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [cbbtcBalance, setCbbtcBalance] = useState<string>('0');
  const [usdcBalanceNum, setUsdcBalanceNum] = useState<number>(0);
  const [cbbtcBalanceNum, setCbbtcBalanceNum] = useState<number>(0);
  const [pricesUSD, setPricesUSD] = useState<{ eth: number; usdc: number; cbbtc: number }>({ eth: 0, usdc: 1, cbbtc: 0 });
  const [ethBalanceNum, setEthBalanceNum] = useState<number>(0);

  // Avoid crashing on missing env; use server proxy routes instead
  const apiKey = process.env.NEXT_PUBLIC_EXPLORER_API_KEY || '';

  // Active Account
  const address = useActiveAccount()?.address;

  // MUI Theme and Responsiveness
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  // Active Wallet
  const wallet = useActiveWallet()?.getAccount();

  // Effect Hook
  useEffect(() => {
    (async () => {
      const client = await clientPromise;
      if (!client) return;
      // reads independent of wallet
      await fetchAllData();
      await fetchTransactionData();
      // writes/role require wallet
      if (wallet && address) {
        await checkIfChief();
      } else {
        setIsChief(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  // Fetch USD prices (ETH, USDC, BTC) and refresh periodically
  useEffect(() => {
    let timer: any;
    const load = async () => {
      try {
        const resp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin,bitcoin&vs_currencies=usd', { cache: 'no-store' });
        const j = await resp.json();
        setPricesUSD({
          eth: Number(j?.ethereum?.usd || 0),
          usdc: Number(j?.['usd-coin']?.usd || 1),
          cbbtc: Number(j?.bitcoin?.usd || 0),
        });
      } catch {}
    };
    load();
    timer = setInterval(load, 1000 * 60 * 5);
    return () => timer && clearInterval(timer);
  }, []);

  // Fetch Beneficiaries
  const fetchAllData = async () => {
    try {
      const address = await getContractAddress();
      const contract = getContract({
        client: await clientPromise as any,
        chain: base,
        address: address as string,
        abi: abi,
      });

      // Fetch Beneficiaries
      const beneficiariesData = await readContract({
        contract,
        method: 'getBeneficiaries',
        params: [],
      });
      setBeneficiaries(beneficiariesData);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching contract data:', error);
      setLoading(false);
    }
  };

  // Check if User is Chief
  const checkIfChief = async () => {
    try {
      const contractAddr = await getContractAddress();
      const contract = getContract({
        client: await clientPromise as any,
        chain: base,
        address: contractAddr as string,
        abi: abi,
      });

      const hasRole = await readContract({
        contract,
        method: 'nftpdHasRole',
        params: [CHIEF_OF_POLICE_ROLE, address],
      });

      setIsChief(hasRole as boolean);
    } catch (error) {
      console.error('Error checking role:', error);
    }
  };

  // Fetch Transactions (External and Internal)
  const fetchTransactionData = async () => {
    try {
      const contractAddr = await getContractAddress();
      const externalResp = await fetch(`/api/explorer/account?action=txlist&address=${contractAddr}&sort=asc`, { cache: 'no-store' });
      const externalData = await externalResp.json();
      // const internalData = internalTxResponse.data;

      if (externalData.status !== '1') {
        console.error('Error fetching external transactions:', externalData.message);
        return;
      }

      // if (internalData.status !== '1') {
      //   console.error('Error fetching internal transactions:', internalData.message);
      //   return;
      // }

      // Combine both transaction lists
      // const combinedTransactions = [...externalData.result, ...internalData.result];
      const combinedTransactions = [...externalData.result];

      // Sort transactions by timestamp in ascending order
      combinedTransactions.sort((a, b) => Number(a.timeStamp) - Number(b.timeStamp));

      const txCount = combinedTransactions.length;
      setTransactionCount(txCount);

      const lastTransactions = combinedTransactions.slice(-4).reverse();
      setLastTransactions(lastTransactions);

      // Process transactions to calculate ETH balance history
      const ethHistory = await processBalanceHistory(combinedTransactions);

      // Token histories (USDC, cbBTC)
      const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      const CBBTC_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
      const tokenHistoryBuilder = async (tokenAddress: string) => {
        try {
          const resp = await fetch(`/api/explorer/account?action=tokentx&address=${contractAddr}&contractaddress=${tokenAddress}&sort=asc`, { cache: 'no-store' });
          const json = await resp.json();
          if (json?.status !== '1' || !Array.isArray(json?.result)) return [] as any[];
          let decimals = 18;
          try {
            const client = await clientPromise as any;
            const erc20Abi = [
              { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
            ];
            const erc20 = getContract({ client, chain: base, address: tokenAddress, abi: erc20Abi as any });
            const d = await (readContract as any)({ contract: erc20, method: 'decimals' });
            decimals = Number(d || 18);
          } catch {}
          let running = 0n;
          const points: any[] = [];
          const sorted = json.result.sort((a: any, b: any) => Number(a.timeStamp) - Number(b.timeStamp));
          for (const tx of sorted) {
            const value = BigInt(tx.value || '0');
            const ts = Number(tx.timeStamp) * 1000;
            const from = String(tx.from || '').toLowerCase();
            const to = String(tx.to || '').toLowerCase();
            if (to === String(contractAddr).toLowerCase()) running += value;
            else if (from === String(contractAddr).toLowerCase()) running -= value;
            const num = Number(running) / Math.pow(10, decimals);
            points.push({ timestamp: new Date(ts).toLocaleDateString(), value: num });
          }
          return points;
        } catch { return [] as any[]; }
      };

      const [usdcHist, cbbtcHist] = await Promise.all([
        tokenHistoryBuilder(USDC_ADDRESS),
        tokenHistoryBuilder(CBBTC_ADDRESS),
      ]);

      const unify = () => {
        const map = new Map<string, { timestamp: string; eth?: number; usdc?: number; cbbtc?: number }>();
        let lastEth = 0, lastUsdc = 0, lastCbbtc = 0;
        for (const p of ethHistory) {
          const key = p.timestamp as string;
          const ref = map.get(key) || { timestamp: key };
          ref.eth = p.balance;
          map.set(key, ref);
        }
        for (const p of usdcHist) {
          const key = p.timestamp as string;
          const ref = map.get(key) || { timestamp: key };
          ref.usdc = p.value;
          map.set(key, ref);
        }
        for (const p of cbbtcHist) {
          const key = p.timestamp as string;
          const ref = map.get(key) || { timestamp: key };
          ref.cbbtc = p.value;
          map.set(key, ref);
        }
        const arr = Array.from(map.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return arr.map((row) => {
          if (typeof row.eth === 'number') lastEth = row.eth;
          if (typeof row.usdc === 'number') lastUsdc = row.usdc;
          if (typeof row.cbbtc === 'number') lastCbbtc = row.cbbtc;
          return { timestamp: row.timestamp, balance: lastEth, usdc: lastUsdc, cbbtc: lastCbbtc };
        });
      };

      setBalanceHistory(unify());

      // Live token balances via ERC20 balanceOf
      try {
        const client = await clientPromise as any;
        const erc20Abi = [
          { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
          { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
        ];
        const usdc = getContract({ client, chain: base, address: USDC_ADDRESS, abi: erc20Abi as any });
        const cbbtc = getContract({ client, chain: base, address: CBBTC_ADDRESS, abi: erc20Abi as any });
        const [usdcBalRaw, usdcDec, cbbtcBalRaw, cbbtcDec] = await Promise.all([
          (readContract as any)({ contract: usdc, method: 'balanceOf', params: [contractAddr] }),
          (readContract as any)({ contract: usdc, method: 'decimals' }),
          (readContract as any)({ contract: cbbtc, method: 'balanceOf', params: [contractAddr] }),
          (readContract as any)({ contract: cbbtc, method: 'decimals' }),
        ]);
        const usdcBal = Number(usdcBalRaw) / Math.pow(10, Number(usdcDec || 6));
        const cbbtcBal = Number(cbbtcBalRaw) / Math.pow(10, Number(cbbtcDec || 8));
        setUsdcBalanceNum(usdcBal);
        setCbbtcBalanceNum(cbbtcBal);
        setUsdcBalance(usdcBal.toLocaleString(undefined, { maximumFractionDigits: 4 }));
        setCbbtcBalance(cbbtcBal.toLocaleString(undefined, { maximumFractionDigits: 6 }));
      } catch {}
    } catch (error) {
      console.error('Error fetching transaction data:', error);
    }
  };

  // Process Balance History
  const processBalanceHistory = async (transactions: any[]) => {
    try {
      // Initialize balance at zero
      let balance = 0n; // BigInt starting at 0

      const balanceHistoryData: any[] = [];

      // Ensure transactions are sorted in ascending order
      const sortedTransactions = transactions.sort(
        (a, b) => Number(a.timeStamp) - Number(b.timeStamp)
      );

      const contractAddressLower = (await getContractAddress())?.toLowerCase();

      let previousBalance = 0n; // To store the previous balance for percentage change

      sortedTransactions.forEach((txn) => {
        const value = BigInt(txn.value || '0'); // Transaction value in wei
        const timestamp = Number(txn.timeStamp) * 1000; // Convert to milliseconds

        const txnToLower = (txn.to || '').toLowerCase();
        const txnFromLower = (txn.from || '').toLowerCase();

        if (txnToLower === contractAddressLower) {
          // Incoming transaction (Deposit)
          balance += value;
        } else if (txnFromLower === contractAddressLower) {
          // Outgoing transaction (Withdrawal)
          balance -= value;

          // Prevent balance from going negative (optional safeguard)
          if (balance < 0n) {
            console.warn('Balance went negative. Adjusting to 0.');
            balance = 0n;
          }
        }

        // Calculate percentage change
        let percentageChange: number | null = null;
        if (previousBalance !== 0n) {
          percentageChange =
            Number(balance - previousBalance) / Number(previousBalance) * 100;
        }

        balanceHistoryData.push({
          timestamp: new Date(timestamp).toLocaleDateString(),
          balance: Number(formatEther(balance.toString())), // Convert balance to Ether format
          percentageChange, // Percentage change from previous balance
        });

        // Update previous balance
        previousBalance = balance;

        // Debugging: Log each balance update
        console.log(
          `After txn ${txn.hash}: Balance = ${formatEther(
            balance.toString()
          )} ETH, Change = ${
            percentageChange !== null ? percentageChange.toFixed(2) + '%' : 'N/A'
          }`
        );
      });

      // Fetch the current balance of the contract to verify accuracy
      const addr = await getContractAddress();
      const balResp = await fetch(`/api/explorer/account?action=balance&address=${addr}&tag=latest`, { cache: 'no-store' });
      const balanceData = await balResp.json();

      if (balanceData.status === '1') {
        const currentBalance = BigInt(balanceData.result);
        const calculatedBalance = balance;

        if (currentBalance !== calculatedBalance) {
          console.warn(
            `Discrepancy detected! Calculated Balance: ${formatEther(
              calculatedBalance.toString()
            )} ETH, Actual Balance: ${formatEther(
              currentBalance.toString()
            )} ETH`
          );
        } else {
          console.log(
            `Balance verification successful: ${formatEther(
              calculatedBalance.toString()
            )} ETH`
          );
        }
      } else {
        console.error('Error fetching balance:', balanceData.message);
      }

      setBalanceHistory(balanceHistoryData);

      // Update the displayed balance to match the calculated balance
      const ethNum = Number(formatEther(balance.toString()));
      setBalance(ethNum.toLocaleString(undefined, { maximumFractionDigits: 4 }));
      setEthBalanceNum(ethNum);
      return balanceHistoryData;
    } catch (error) {
      console.error('Error processing balance history:', error);
      return [] as any[];
    }
  };

  // Handle Add Beneficiary
  const handleAddBeneficiary = async () => {
    if (!newBeneficiary.address || newBeneficiary.split <= 0 || !newBeneficiary.role) {
      alert('Please fill all fields correctly.');
      return;
    }

    try {
      if (!wallet) {
        alert('Wallet not connected.');
        return;
      }

      const address = await getContractAddress();
      const contract = getContract({
        client: await clientPromise as any,
        chain: base,
        address: address as string,
        abi: abi,
      });

      const tx = await prepareContractCall({
        contract,
        method: 'addBeneficiary',
        params: [newBeneficiary.address, newBeneficiary.split, newBeneficiary.role],
      });

      await sendAndConfirmTransaction({
        transaction: tx,
        account: wallet,
      });

      alert('Beneficiary added successfully!');
      setOpenAddBeneficiary(false);
      setNewBeneficiary({ address: '', split: 0, role: '' });
      fetchAllData();
      fetchTransactionData(); // Refresh transactions
    } catch (error) {
      console.error('Error adding beneficiary:', error);
      alert('Failed to add beneficiary.');
    }
  };

  // Handle Update Beneficiary
  const handleUpdateBeneficiary = async () => {
    if (!currentBeneficiary.address || currentBeneficiary.split <= 0 || !currentBeneficiary.role) {
      alert('Please fill all fields correctly.');
      return;
    }

    try {
      if (!wallet) {
        alert('Wallet not connected.');
        return;
      }

      const address = await getContractAddress();
      const contract = getContract({
        client: await clientPromise as any,
        chain: base,
        address: address as string,
        abi: abi,
      });

      const tx = await prepareContractCall({
        contract,
        method: 'updateBeneficiary',
        params: [currentBeneficiary.address, currentBeneficiary.split, currentBeneficiary.role],
      });

      await sendAndConfirmTransaction({
        transaction: tx,
        account: wallet,
      });

      alert('Beneficiary updated successfully!');
      setOpenUpdateBeneficiary(false);
      setCurrentBeneficiary({ index: 0, address: '', split: 0, role: '' });
      fetchAllData();
      fetchTransactionData(); // Refresh transactions
    } catch (error) {
      console.error('Error updating beneficiary:', error);
      alert('Failed to update beneficiary.');
    }
  };

  // Handle Remove Beneficiary
  const handleRemoveBeneficiary = async (index: number) => {
    if (!window.confirm('Are you sure you want to remove this beneficiary?')) return;

    try {
      if (!wallet) {
        alert('Wallet not connected.');
        return;
      }

      const address = await getContractAddress();
      const contract = getContract({
        client: await clientPromise as any,
        chain: base,
        address: address as string,
        abi: abi,
      });

      const tx = await prepareContractCall({
        contract,
        method: 'removeBeneficiaryByIndex',
        params: [index],
      });

      await sendAndConfirmTransaction({
        transaction: tx,
        account: wallet,
      });

      alert('Beneficiary removed successfully!');
      fetchAllData();
      fetchTransactionData(); // Refresh transactions
    } catch (error) {
      console.error('Error removing beneficiary:', error);
      alert('Failed to remove beneficiary.');
    }
  };

  // Handle Write Functions
  const handleWriteFunction = async () => {
    try {
      if (!wallet) {
        alert('Wallet not connected.');
        return;
      }

      const contract = getContract({
        client: await clientPromise as any,
        chain: base,
        address: await getContractAddress() as string,
        abi: abi,
      });

      let tx;

      switch (selectedFunction) {
        case 'depositFunds':
          if (!functionInputs.amount || !functionInputs.note) {
            alert('Please provide both amount and note.');
            return;
          }
          tx = await prepareContractCall({
            contract,
            method: 'depositFunds',
            params: [functionInputs.note],
            value: parseEther(functionInputs.amount),
          });
          break;
        case 'withdraw':
          tx = await prepareContractCall({
            contract,
            method: 'withdraw',
            params: [],
          });
          break;
        case 'sendFundsToUtilityCoDiamond':
          if (!functionInputs.percentage || !functionInputs.note) {
            alert('Please provide both percentage and note.');
            return;
          }
          tx = await prepareContractCall({
            contract,
            method: 'sendFundsToUtilityCoDiamond',
            params: [Number(functionInputs.percentage), functionInputs.note],
          });
          break;
        // case 'updateAndSyncBeneficiaries':
        //   tx = await prepareContractCall({
        //     contract,
        //     method: 'updateAndSyncBeneficiaries',
        //     params: [],
        //   });
        //   break;
        case 'wipeBeneficiaries':
          tx = await prepareContractCall({
            contract,
            method: 'wipeBeneficiaries',
            params: [],
          });
          break;
        // Add cases for other write functions as needed
        default:
          alert('Function not implemented.');
          return;
      }

      await sendAndConfirmTransaction({
        transaction: tx,
        account: wallet,
      });

      alert(`${selectedFunction} executed successfully!`);
      setOpenWriteFunctionDialog(false);
      setFunctionInputs({});
      fetchAllData();
      fetchTransactionData(); // Refresh transactions
    } catch (error) {
      console.error(`Error executing ${selectedFunction}:`, error);
      alert(`Failed to execute ${selectedFunction}.`);
    }
  };

  // Render Beneficiaries Chart
  const renderBeneficiariesChart = () => {
    if (!beneficiaries || beneficiaries.length === 0) return null;

    const data = beneficiaries.map((b: any) => ({
      name: b.role,
      value: Number(b.split),
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            fill="#8884d8"
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#121212" />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  // Render Transactions Table
  const renderTransactionsTable = () => {
    if (!lastTransactions || lastTransactions.length === 0) return null;

    return (
      <TableContainer sx={{ mt: 2 }}>
        <Table aria-label="last transactions">
          <TableHead>
            <TableRow>
              <StyledTableCell>Txn Hash</StyledTableCell>
              <StyledTableCell>From</StyledTableCell>
              <StyledTableCell>To</StyledTableCell>
              <StyledTableCell>Amount (ETH)</StyledTableCell>
              <StyledTableCell>Timestamp</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lastTransactions.map((txn, index) => (
              <TableRow key={index}>
                <StyledTableCell>
                  <a
                    href={`https://basescan.org/tx/${txn.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: theme.palette.primary.main, textDecoration: 'none' }}
                  >
                    {txn.hash.substring(0, 10)}...
                  </a>
                </StyledTableCell>
                <StyledTableCell>
                  <a
                    href={`https://basescan.org/address/${txn.from}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: theme.palette.primary.main, textDecoration: 'none' }}
                  >
                    {txn.from.substring(0, 10)}...
                  </a>
                </StyledTableCell>
                <StyledTableCell>
                  <a
                    href={`https://basescan.org/address/${txn.to}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: theme.palette.primary.main, textDecoration: 'none' }}
                  >
                    {txn.to.substring(0, 10)}...
                  </a>
                </StyledTableCell>
                <StyledTableCell>{formatEther(txn.value || '0')} ETH</StyledTableCell>
                <StyledTableCell>{new Date(txn.timeStamp * 1000).toLocaleString()}</StyledTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render Balance Over Time Chart
  const renderBalanceHistoryChart = () => {
    if (!balanceHistory || balanceHistory.length === 0) return null;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={balanceHistory}
          margin={{ top: 20, right: 20, bottom: -20, left: -40 }} // Even padding
        >
          {/* Define the glow filter */}
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Remove grid by omitting CartesianGrid */}

          {/* X Axis without ticks and labels */}
          <XAxis
            dataKey="timestamp"
            tick={false}
            axisLine={false}
          />

          {/* Y Axis without ticks and labels */}
          <YAxis
            tick={false}
            axisLine={false}
          />

          {/* Custom Tooltip */}
          <Tooltip content={<CustomTooltip />} />

          {/* Line with customized dots and glow effect */}
          <Line
            type="monotone"
            dataKey="balance"
            stroke="#c229f5" // Line color
            strokeWidth={3}
            dot={{ r: 4, fill: '#c229f5', stroke: 'none' }} // Dots match the line color
            activeDot={{ r: 6, fill: '#c229f5', stroke: 'none' }}
            filter="url(#glow)" // Apply glow filter
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // Loading State
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <MainContainer>
          <StyledContainer>
            <CircularProgress color="primary" />
            <StyledTypography variant="h6" sx={{ mt: 2 }}>
              Loading Reserve Dashboard...
            </StyledTypography>
          </StyledContainer>
        </MainContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <MainContainer>
        <StyledContainer>
          <Box sx={{ pt: isMobile ? '90px' : '28px', display: 'flex', alignItems: 'center', gap: 2 }}>
            <img src="/Medallions/NFTPD.png" alt="NFTPD" style={{ width: 42, height: 42, objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' }} />
            <StyledTypography variant={isMobile ? 'h4' : 'h3'} sx={{ textShadow: '0 0 14px rgba(127,44,255,0.35)' }}>
              Reserve Dashboard
            </StyledTypography>
          </Box>

          {/* Transaction Count and Balance */}
          <Grid container spacing={2} sx={{ maxWidth: 1200, mt: 2, px: { xs: 1, md: 0 } }}>
            {balance !== '0' && (
              <Grid item xs={12} md={6}>
                <Card
                  elevation={3}
                  sx={{
                    borderRadius: 2,
                    backdropFilter: 'blur(10px)',
                    background: 'linear-gradient(180deg, rgba(127,44,255,0.18), rgba(127,44,255,0.10))',
                    border: '1px solid rgba(127,44,255,0.35)',
                    height: '100%',
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap={{ xs: 'wrap', md: 'nowrap' }}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <WalletIcon color="primary" fontSize="large" sx={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' }} />
                        <StyledTypography variant="h6" sx={{ whiteSpace: 'nowrap' }}>Contract Balance</StyledTypography>
                      </Box>
                      <Box textAlign={{ xs: 'left', md: 'right' }} sx={{ minWidth: { md: 220 }, width: { xs: '100%', md: 'auto' } }}>
                        <StyledTypography variant="h5" sx={{ lineHeight: 1, whiteSpace: 'nowrap' }}>{balance} {TOKEN_SYMBOLS.ETH}</StyledTypography>
                        <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1.5, flexWrap: 'wrap', mt: 0.75 }}>
                          <StyledTypography variant="body2" sx={{ opacity: 0.95, display: 'flex', gap: 0.75, alignItems: 'baseline', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 10, color: '#E0E0E0' }}>{TOKEN_SYMBOLS.USDC}</span> {usdcBalance}
                          </StyledTypography>
                          <StyledTypography variant="body2" sx={{ opacity: 0.95, display: 'flex', gap: 0.75, alignItems: 'baseline', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 10, color: '#E0E0E0' }}>{TOKEN_SYMBOLS.CBBTC}</span> {cbbtcBalance}
                          </StyledTypography>
                          <StyledTypography variant="body2" sx={{ opacity: 0.95, display: 'flex', gap: 0.75, alignItems: 'baseline', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 10, color: '#E0E0E0' }}>$</span> {(ethBalanceNum*pricesUSD.eth + usdcBalanceNum*pricesUSD.usdc + cbbtcBalanceNum*pricesUSD.cbbtc).toLocaleString(undefined,{maximumFractionDigits:2})}
                          </StyledTypography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
            {transactionCount > 0 && (
              <Grid item xs={12} md={6}>
                <Card
                  elevation={3}
                  sx={{
                    borderRadius: 2,
                    backdropFilter: 'blur(10px)',
                    background: 'linear-gradient(180deg, rgba(127,44,255,0.18), rgba(127,44,255,0.10))',
                    border: '1px solid rgba(127,44,255,0.35)',
                    height: '100%',
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                      <SyncIcon color="primary" fontSize="large" sx={{ mr: 2, filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' }} />
                      <Box textAlign={{ xs: 'left', md: 'right' }} sx={{ width: { xs: '100%', md: 'auto' } }}>
                        <StyledTypography variant="h6">Transaction Count</StyledTypography>
                        <StyledTypography variant="h5" sx={{ lineHeight: 1 }}>{transactionCount}</StyledTypography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>

          {/* Donation CTA */}
          <StyledCard>
            <CardContent>
              <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? 'stretch' : 'center'} gap={2}>
                <Box>
                  <StyledTypography variant="h5" gutterBottom>
                    Support the Reserve
                  </StyledTypography>
                  <StyledTypography variant="body1" sx={{ opacity: 0.9 }}>
                    Donate crypto directly to the main Diamond to fuel operations and community impact.
                  </StyledTypography>
                </Box>
                <DonateButton />
              </Box>
            </CardContent>
          </StyledCard>

          {/* Balance History Chart */}
          {balanceHistory && balanceHistory.length > 0 && (
            <StyledCard>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <TimelineIcon color="primary" fontSize="large" sx={{ mr: 2 }} />
                  <StyledTypography variant="h5">Reserve Over Time</StyledTypography>
                </Box>
                <StyledTypography variant="body2" sx={{ opacity: 0.8, marginBottom: 1 }}>
                  <span style={{ fontSize: 10, color: '#E0E0E0' }}>LEGEND:</span> ETH, USDC, cbBTC
                </StyledTypography>
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <ResponsiveContainer width="95%" height={320}>
                    <LineChart data={balanceHistory} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                    <defs>
                      <filter id="glowP" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <XAxis dataKey="timestamp" tick={false} axisLine={false} />
                    <YAxis tick={false} axisLine={false} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null as any;
                      const p:any = payload[0].payload;
                      return (
                        <div style={{ background: '#121212', color: '#fff', padding: 10, borderRadius: 8, boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
                          <div style={{ fontSize: 12, opacity: 0.9 }}>{p.timestamp}</div>
                          <div style={{ fontSize: 12 }}>ETH: {Number(p.balance).toLocaleString(undefined,{maximumFractionDigits:4})}</div>
                          <div style={{ fontSize: 12 }}>USDC: {Number(p.usdc||0).toLocaleString(undefined,{maximumFractionDigits:2})}</div>
                          <div style={{ fontSize: 12 }}>cbBTC: {Number(p.cbbtc||0).toLocaleString(undefined,{maximumFractionDigits:6})}</div>
                        </div>
                      ) as any;
                    }} />
                    <Line type="monotone" dataKey="balance" stroke="#ffffff" strokeWidth={3} dot={false} filter="url(#glowP)" />
                    <Line type="monotone" dataKey="usdc" stroke="#cccccc" strokeWidth={2} dot={false} opacity={0.9} />
                    <Line type="monotone" dataKey="cbbtc" stroke="#999999" strokeWidth={2} dot={false} opacity={0.9} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </StyledCard>
          )}

          {/* Recent Transactions */}
          {lastTransactions && lastTransactions.length > 0 && (
            <StyledCard>
              <CardContent>
                <StyledTypography variant="h5" gutterBottom>
                  Recent Transactions
                </StyledTypography>
                {renderTransactionsTable()}
              </CardContent>
            </StyledCard>
          )}

          {/* Beneficiaries Section */}
          {beneficiaries && beneficiaries.length > 0 && (
            <StyledCard>
              <CardContent>
                <StyledTypography variant="h5" gutterBottom>
                  Beneficiaries
                </StyledTypography>
                {renderBeneficiariesChart()}
                {isChief && (
                  <Box
                    mt={2}
                    display="flex"
                    flexDirection={isMobile ? 'column' : 'row'}
                    justifyContent="flex-end"
                    gap={2}
                  >
                    <StyledButton
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setOpenAddBeneficiary(true)}
                      color="primary"
                    >
                      Add Beneficiary
                    </StyledButton>
                    <StyledButton
                      variant="contained"
                      startIcon={<UpdateIcon />}
                    //   onClick={() => {
                    //     setSelectedFunction('updateAndSyncBeneficiaries');
                    //     setOpenWriteFunctionDialog(true);
                    //   }}
                      color="primary"
                    >
                      Sync Beneficiaries
                    </StyledButton>
                  </Box>
                )}
                <Box mt={2}>
                  {beneficiaries.map((beneficiary, index) => (
                    <Paper
                      key={index}
                      elevation={1}
                      sx={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        mb: 2,
                        borderRadius: 2,
                        backdropFilter: 'blur(10px)',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      }}
                    >
                      <Box>
                        <StyledTypography variant="body1">
                          <strong>Address:</strong> {beneficiary.beneficiaryAddress}
                        </StyledTypography>
                        <StyledTypography variant="body1">
                          <strong>Split:</strong> {beneficiary.split}%
                        </StyledTypography>
                        <StyledTypography variant="body1">
                          <strong>Role:</strong> {beneficiary.role}
                        </StyledTypography>
                      </Box>
                      {isChief && (
                        <Box mt={isMobile ? 2 : 0}>
                          <StyledButton
                            variant="outlined"
                            startIcon={<UpdateIcon />}
                            onClick={() => {
                              setCurrentBeneficiary({
                                index,
                                address: beneficiary.beneficiaryAddress,
                                split: beneficiary.split,
                                role: beneficiary.role,
                              });
                              setOpenUpdateBeneficiary(true);
                            }}
                            sx={{ mr: isMobile ? 0 : 1, mb: isMobile ? 1 : 0 }}
                          >
                            Update
                          </StyledButton>
                          <StyledButton
                            variant="contained"
                            color="error"
                            startIcon={<RemoveIcon />}
                            onClick={() => handleRemoveBeneficiary(index)}
                          >
                            Remove
                          </StyledButton>
                        </Box>
                      )}
                    </Paper>
                  ))}
                </Box>
              </CardContent>
            </StyledCard>
          )}

          {/* Write Functions Section */}
          {isChief && (
            <StyledCard>
              <CardContent>
                <StyledTypography variant="h5" gutterBottom>
                  Administrative Actions
                </StyledTypography>

                {/* Fund Management Section */}
                <StyledTypography variant="h6" gutterBottom>
                  Fund Management
                </StyledTypography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <StyledButton
                      variant="contained"
                      startIcon={<AttachMoneyIcon />}
                      onClick={() => {
                        setSelectedFunction('depositFunds');
                        setOpenWriteFunctionDialog(true);
                      }}
                      fullWidth
                    >
                      Deposit Funds
                    </StyledButton>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <StyledButton
                      variant="contained"
                      startIcon={<MoneyOffIcon />}
                      onClick={() => {
                        setSelectedFunction('withdraw');
                        setOpenWriteFunctionDialog(true);
                      }}
                      fullWidth
                    >
                      Withdraw Funds
                    </StyledButton>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <StyledButton
                      variant="contained"
                      startIcon={<SendIcon />}
                      onClick={() => {
                        setSelectedFunction('sendFundsToUtilityCoDiamond');
                        setOpenWriteFunctionDialog(true);
                      }}
                      fullWidth
                    >
                      Send Funds To The Utility Co
                    </StyledButton>
                  </Grid>
                </Grid>

                {/* Beneficiary Management Section */}
                <StyledTypography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Beneficiary Management
                </StyledTypography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <StyledButton
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setOpenAddBeneficiary(true)}
                      fullWidth
                      color="primary"
                    >
                      Add Beneficiary
                    </StyledButton>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <StyledButton
                      variant="contained"
                    //   startIcon={<SyncIcon />}
                    //   onClick={() => {
                    //     setSelectedFunction('updateAndSyncBeneficiaries');
                    //     setOpenWriteFunctionDialog(true);
                    //   }}
                      fullWidth
                      color="info"
                    >
                      Welcome to the Reserve
                    </StyledButton>
                  </Grid>
                  <Grid item xs={12}>
                    <StyledButton
                      variant="contained"
                      startIcon={<DeleteForeverIcon />}
                      onClick={() => {
                        setSelectedFunction('wipeBeneficiaries');
                        handleWriteFunction();
                      }}
                      fullWidth
                      color="warning"
                    >
                      Wipe Beneficiaries
                    </StyledButton>
                  </Grid>
                </Grid>
              </CardContent>
            </StyledCard>
          )}

          {/* Add Beneficiary Dialog */}
          <Dialog
            open={openAddBeneficiary}
            onClose={() => setOpenAddBeneficiary(false)}
            fullWidth
            maxWidth="sm"
            PaperProps={{
              style: {
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
              },
            }}
          >
            <DialogTitle>Add New Beneficiary</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Beneficiary Address"
                type="text"
                fullWidth
                variant="outlined"
                value={newBeneficiary.address}
                onChange={(e) => setNewBeneficiary({ ...newBeneficiary, address: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Split (%)"
                type="number"
                fullWidth
                variant="outlined"
                value={newBeneficiary.split}
                onChange={(e) => setNewBeneficiary({ ...newBeneficiary, split: Number(e.target.value) })}
              />
              <TextField
                margin="dense"
                label="Role"
                type="text"
                fullWidth
                variant="outlined"
                value={newBeneficiary.role}
                onChange={(e) => setNewBeneficiary({ ...newBeneficiary, role: e.target.value })}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenAddBeneficiary(false)} color="secondary">
                Cancel
              </Button>
              <Button onClick={handleAddBeneficiary} variant="contained" color="primary">
                Add
              </Button>
            </DialogActions>
          </Dialog>

          {/* Update Beneficiary Dialog */}
          <Dialog
            open={openUpdateBeneficiary}
            onClose={() => setOpenUpdateBeneficiary(false)}
            fullWidth
            maxWidth="sm"
            PaperProps={{
              style: {
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
              },
            }}
          >
            <DialogTitle>Update Beneficiary</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Beneficiary Address"
                type="text"
                fullWidth
                variant="outlined"
                value={currentBeneficiary.address}
                onChange={(e) => setCurrentBeneficiary({ ...currentBeneficiary, address: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Split (%)"
                type="number"
                fullWidth
                variant="outlined"
                value={currentBeneficiary.split}
                onChange={(e) => setCurrentBeneficiary({ ...currentBeneficiary, split: Number(e.target.value) })}
              />
              <TextField
                margin="dense"
                label="Role"
                type="text"
                fullWidth
                variant="outlined"
                value={currentBeneficiary.role}
                onChange={(e) => setCurrentBeneficiary({ ...currentBeneficiary, role: e.target.value })}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenUpdateBeneficiary(false)} color="secondary">
                Cancel
              </Button>
              <Button onClick={handleUpdateBeneficiary} variant="contained" color="primary">
                Update
              </Button>
            </DialogActions>
          </Dialog>

          {/* Write Function Dialog */}
          <Dialog
            open={openWriteFunctionDialog}
            onClose={() => setOpenWriteFunctionDialog(false)}
            fullWidth
            maxWidth="sm"
            PaperProps={{
              style: {
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
              },
            }}
          >
            <DialogTitle>{`Execute ${selectedFunction}`}</DialogTitle>
            <DialogContent>
              {selectedFunction === 'depositFunds' && (
                <>
                  <TextField
                    autoFocus
                    margin="dense"
                    label="Amount (ETH)"
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={functionInputs.amount || ''}
                    onChange={(e) => setFunctionInputs({ ...functionInputs, amount: e.target.value })}
                  />
                  <TextField
                    margin="dense"
                    label="Note"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={functionInputs.note || ''}
                    onChange={(e) => setFunctionInputs({ ...functionInputs, note: e.target.value })}
                  />
                </>
              )}
              {selectedFunction === 'sendFundsToUtilityCoDiamond' && (
                <>
                  <TextField
                    autoFocus
                    margin="dense"
                    label="Percentage (%)"
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={functionInputs.percentage || ''}
                    onChange={(e) => setFunctionInputs({ ...functionInputs, percentage: e.target.value })}
                  />
                  {/* <TextField
                    autoFocus
                    margin="dense"
                    label="Address"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={functionInputs.address || ''}
                    onChange={(e) => setFunctionInputs({ ...functionInputs, address: e.target.value })}
                  /> */}
                  <TextField
                    margin="dense"
                    label="Note"
                    type="text"
                    fullWidth
                    variant="outlined"
                    value={functionInputs.note || ''}
                    onChange={(e) => setFunctionInputs({ ...functionInputs, note: e.target.value })}
                  />
                </>
              )}
              {/* Add input fields for other functions as needed */}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenWriteFunctionDialog(false)} color="secondary">
                Cancel
              </Button>
              <Button onClick={handleWriteFunction} variant="contained" color="primary">
                Execute
              </Button>
            </DialogActions>
          </Dialog>
        </StyledContainer>
      </MainContainer>
    </ThemeProvider>
  );
};

export default Reserve;

// Donation button using thirdweb TransactionButton
function DonateButton() {
  const account = useActiveAccount();
  const [clientId, setClientId] = React.useState<string | null>(null);
  const [diamondAddr, setDiamondAddr] = React.useState<string | null>(null);
  const [amountEth, setAmountEth] = React.useState<string>('0.05');
  const [token, setToken] = React.useState<'ETH' | 'USDC' | 'cbBTC'>('ETH');
  const [symbols, setSymbols] = React.useState<Record<string, string>>({ ETH: 'ETH', USDC: 'USDC', cbBTC: 'cbBTC' });
  const [openCheckout, setOpenCheckout] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Base mainnet token addresses
  const USDC_ADDRESS = '0x833589fCD6eDb6e08f4c7C32D4f71b54bdA02913';
  const CBBTC_ADDRESS = '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';

  React.useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
        const json = await resp.json();
        if (json?.clientId) setClientId(json.clientId);
      } catch {}
      try {
        const addr = await getDiamondAddress();
        setDiamondAddr(addr);
      } catch {}
    })();
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  // Resolve symbols from Coingecko for accuracy (fallback to hardcoded if missing)
  React.useEffect(() => {
    (async () => {
      try {
        const fetchSymbol = async (address: string) => {
          try {
            // Coingecko on Base mainnet
            const r = await fetch(`https://api.coingecko.com/api/v3/coins/base/contract/${address}`, { cache: 'no-store' });
            if (!r.ok) return null;
            const j = await r.json();
            return (j?.symbol || '').toUpperCase() || null;
          } catch { return null; }
        };
        const [usdcSym, cbbtcSym] = await Promise.all([
          fetchSymbol(USDC_ADDRESS),
          fetchSymbol(CBBTC_ADDRESS),
        ]);
        const next: Record<string, string> = { ...symbols };
        next.USDC = usdcSym || 'USDC';
        next.cbBTC = cbbtcSym || 'cbBTC';
        setSymbols(next);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const portalTheme = darkTheme({
    colors: {
      primaryButtonBg: '#ffffff',
      primaryButtonText: '#ffffff',
      secondaryButtonBg: 'rgba(255,255,255,0.25)',
      secondaryButtonText: '#f1f1f1',
      accentButtonBg: '#e6e6e6',
      accentText: '#111111',
      borderColor: '#ffffff',
      modalBg: 'rgba(0,0,0,0.35)',
      tertiaryBg: 'rgba(255,255,255,0.18)',
      primaryText: '#ffffff',
      secondaryText: '#e0e0e0',
    },
    fontFamily: 'Inter, system-ui, sans-serif',
  });

  if (!clientId || !diamondAddr) {
    return (
      <div className="flex items-center justify-center py-2 px-6 rounded-full ring-1 ring-inset" style={{ borderColor: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.12)', color: '#FFFFFF' }}>
        Preparing donation…
      </div>
    );
  }

  // Donation builder supporting ETH, USDC, cbBTC (kept for fallback button if needed)
  const buildTransaction = async () => {
    const client = createThirdwebClient({ clientId });
    if (token === 'ETH') {
      const value = parseEther(amountEth || '0');
      if (value <= 0n) {
        throw new Error('Enter an amount greater than 0');
      }
      return prepareTransaction({ client, chain: base, to: diamondAddr!, value });
    }
    const erc20Abi = [
      { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
      { inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], name: 'transfer', outputs: [{ type: 'bool' }], stateMutability: 'nonpayable', type: 'function' },
    ];
    // lower-case address to bypass checksum validation issues
    const tokenAddress = (token === 'USDC' ? USDC_ADDRESS : CBBTC_ADDRESS).toLowerCase();
    let erc20;
    try {
      erc20 = getTwContract({ client, chain: base, address: tokenAddress, abi: erc20Abi as any });
    } catch (e) {
      // attempt lowercased if not already
      erc20 = getTwContract({ client, chain: base, address: tokenAddress, abi: erc20Abi as any });
    }
    // fetch decimals to parse amount correctly
    let decimals = 18;
    try {
      const d = await (readContract as any)({ contract: erc20, method: 'decimals' });
      decimals = Number(d || 18);
    } catch {}
    const amt = parseUnits(amountEth || '0', decimals);
    if (amt <= 0n) {
      throw new Error('Enter an amount greater than 0');
    }
    return (prepareTwCall as any)({ contract: erc20, method: 'transfer', params: [diamondAddr, amt] });
  };

  // compute token address for pay options
  const tokenAddressForPay = token === 'ETH' ? null : (token === 'USDC' ? USDC_ADDRESS : CBBTC_ADDRESS).toLowerCase();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <select
        value={token}
        onChange={(e) => setToken(e.target.value as any)}
        style={{
          borderRadius: 999,
          padding: '10px 12px',
          background: 'rgba(0,0,0,0.25)',
          color: '#fff',
          border: '1px solid rgba(127,44,255,0.35)'
        }}
      >
        <option value="ETH">{symbols.ETH || 'ETH'}</option>
        <option value="USDC">{symbols.USDC || 'USDC'}</option>
        <option value="cbBTC">{symbols.cbBTC || 'cbBTC'}</option>
      </select>
      <input
        type="number"
        min="0"
        step="0.01"
        value={amountEth}
        onChange={(e) => setAmountEth(e.target.value)}
        placeholder={`Amount (${symbols[token] || token})`}
        style={{
          borderRadius: 999,
          padding: '10px 12px',
          background: 'rgba(0,0,0,0.25)',
          color: '#fff',
          border: '1px solid rgba(127,44,255,0.35)'
        }}
      />
      <StyledButton
        onClick={() => {
          const val = Number(amountEth);
          if (!val || val <= 0) {
            alert('Enter a valid amount');
            return;
          }
          setOpenCheckout(true);
        }}
      >
        Donate {symbols[token] || token}
      </StyledButton>

      {/* Modal with CheckoutWidget for responsive onramp */}
      <Dialog
        open={openCheckout}
        onClose={() => setOpenCheckout(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        PaperProps={{
          style: {
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: 'linear-gradient(180deg, rgba(127,44,255,0.18), rgba(127,44,255,0.10))',
            border: '1px solid rgba(127,44,255,0.35)',
            boxShadow: '0 8px 40px rgba(127, 44, 255, 0.25)',
            borderRadius: 16,
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', color: '#EDE7FF', textShadow: '0 0 14px rgba(127,44,255,0.35)' }}>Donate</DialogTitle>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {(() => {
            const client = createThirdwebClient({ clientId });
            const tokenAddress = token === 'ETH' ? undefined : (token === 'USDC' ? USDC_ADDRESS : CBBTC_ADDRESS);
            const supported = {
              [8453]: [
                { address: USDC_ADDRESS, name: 'USD Coin', symbol: symbols.USDC || 'USDC' },
                { address: CBBTC_ADDRESS, name: 'cbBTC', symbol: symbols.cbBTC || 'cbBTC' },
              ],
            } as any;
            return (
              <div style={{ width: '100%', maxWidth: 520, marginTop: 6 }}>
                <CheckoutWidget
                  client={client}
                  chain={base}
                  theme={portalTheme}
                  // customize title via name/description and container heading
                  amount={amountEth || '0'}
                  tokenAddress={tokenAddress as any}
                  seller={diamondAddr as any}
                  feePayer="seller"
                  name={`Donate (${symbols[token] || token})`}
                  description="Donate to support the Reserve and community initiatives."
                  paymentMethods={["crypto", "card"]}
                  supportedTokens={supported}
                  onSuccess={() => { alert('Thank you for your donation!'); setOpenCheckout(false); }}
                  onError={(err) => {
                    console.error('Checkout error:', err);
                    alert(err?.message || 'Checkout failed');
                  }}
                />
              </div>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', paddingBottom: 2 }}>
          <Button onClick={() => setOpenCheckout(false)} color="secondary">Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

