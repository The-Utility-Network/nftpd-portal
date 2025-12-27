"use client";
// Reserve.tsx

import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  WalletIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  PaperAirplaneIcon,
  TrashIcon,
  ChartBarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { TransactionButton, useActiveAccount, useActiveWallet, CheckoutWidget } from 'thirdweb/react';
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
import { getDiamondAddress } from '../primitives/Diamond';
import { createThirdwebClient } from 'thirdweb';

// Initialize the client in-browser from server-provided clientId
const clientPromise = (async () => {
  try {
    const r = await fetch('/api/thirdweb/client', { cache: 'no-store' });
    const j = await r.json();
    if (j?.clientId) return createThirdwebClient({ clientId: j.clientId });
  } catch { }
  return null;
})();

// Contract Address
let contractAddressPromise: Promise<string> | null = null;
const getContractAddress = async () => {
  if (!contractAddressPromise) contractAddressPromise = getDiamondAddress();
  return contractAddressPromise;
};

// ABI
const abi: any = [{ "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "subsidiaryAddress", "type": "address" }], "name": "BeneficiariesSynced", "type": "event" }, { "anonymous": false, "inputs": [], "name": "BeneficiariesWiped", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "beneficiaryAddress", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "split", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "role", "type": "string" }], "name": "BeneficiaryAdded", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "beneficiaryAddress", "type": "address" }], "name": "BeneficiaryRemoved", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "beneficiaryAddress", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "split", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "role", "type": "string" }], "name": "BeneficiaryUpdated", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "note", "type": "string" }], "name": "FundsDeposited", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "percentage", "type": "uint256" }, { "indexed": false, "internalType": "string", "name": "note", "type": "string" }], "name": "FundsSentToUtilityCoDiamond", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "newPercentage", "type": "uint256" }], "name": "ReserveWithdrawalPercentageUpdated", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }], "name": "Withdrawal", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "newInterval", "type": "uint256" }], "name": "WithdrawalIntervalUpdated", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "newLimit", "type": "uint256" }], "name": "WithdrawalLimitUpdated", "type": "event" }, { "inputs": [{ "internalType": "address", "name": "beneficiaryAddress", "type": "address" }, { "internalType": "uint256", "name": "split", "type": "uint256" }, { "internalType": "string", "name": "role", "type": "string" }], "name": "addBeneficiary", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "note", "type": "string" }], "name": "depositFunds", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [], "name": "getBeneficiaries", "outputs": [{ "components": [{ "internalType": "address", "name": "beneficiaryAddress", "type": "address" }, { "internalType": "uint256", "name": "split", "type": "uint256" }, { "internalType": "string", "name": "role", "type": "string" }], "internalType": "struct InvisibleEnemiesReserve.Beneficiary[]", "name": "", "type": "tuple[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "pullBeneficiariesFromUtilityCoDiamond", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "index", "type": "uint256" }], "name": "removeBeneficiaryByIndex", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "percentage", "type": "uint256" }, { "internalType": "string", "name": "note", "type": "string" }], "name": "sendFundsToUtilityCoDiamond", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "newPercentage", "type": "uint256" }], "name": "setReserveWithdrawalPercentage", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "newInterval", "type": "uint256" }], "name": "setWithdrawalInterval", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "newLimit", "type": "uint256" }], "name": "setWithdrawalLimit", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "updateAndSyncBeneficiaries", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "beneficiaryAddress", "type": "address" }, { "internalType": "uint256", "name": "split", "type": "uint256" }, { "internalType": "string", "name": "role", "type": "string" }], "name": "updateBeneficiary", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "wipeBeneficiaries", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "role", "type": "string" }, { "internalType": "address", "name": "account", "type": "address" }], "name": "ieHasRole", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }] as const;

// Role Definition
const CHIEF_OF_POLICE_ROLE = 'Commander';

const COLORS = ['#ffffff', '#e6e6e6', '#cccccc', '#b3b3b3', '#999999', '#808080', '#666666', '#4d4d4d'];
// Token display symbols
const TOKEN_SYMBOLS = { ETH: 'Ξ', USDC: 'USDC', CBBTC: '₿' } as const;

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const { timestamp, balance, percentageChange } = data;

    return (
      <div className="bg-black/90 border border-white/20 p-3 rounded-lg shadow-xl text-xs">
        <p className="font-bold text-white mb-1">{timestamp}</p>
        <p className="text-white/80">Balance: {balance} ETH</p>
        {typeof percentageChange === 'number' && (
          <p className={percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}>
            Change: {Number(percentageChange).toFixed(2)}%
          </p>
        )}
      </div>
    );
  }

  return null;
};

// Generic Modal Component
const Modal = ({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111] border border-white/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-In">
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <XMarkIcon className="w-5 h-5 text-white/70" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
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

  // Modals state
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

  // Active Account
  const address = useActiveAccount()?.address;
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
      } catch { }
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
      setBeneficiaries(beneficiariesData as any[]);

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
        method: 'ieHasRole',
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

      if (externalData.status !== '1') {
        console.error('Error fetching external transactions:', externalData.message);
        return;
      }

      // Combine both transaction lists - simplified to just external for now as per original code
      const combinedTransactions = [...externalData.result];

      // Sort transactions by timestamp in ascending order
      combinedTransactions.sort((a: any, b: any) => Number(a.timeStamp) - Number(b.timeStamp));

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
          } catch { }
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
      } catch { }
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

          // Prevent balance from going negative
          if (balance < 0n) {
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
      });

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
      fetchTransactionData();
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
      fetchTransactionData();
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
        case 'wipeBeneficiaries':
          tx = await prepareContractCall({
            contract,
            method: 'wipeBeneficiaries',
            params: [],
          });
          break;
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
      fetchTransactionData();
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
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
          <Legend wrapperStyle={{ color: '#fff' }} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white font-mono animate-pulse">
        LOADING RESERVE DATA...
      </div>
    );
  }

  return (
    <div className="bg-black/80 backdrop-blur-xl min-h-[96vh] p-4 md:p-8 text-white overflow-y-auto font-sans relative">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50"></div>

      <div className="max-w-7xl mx-auto space-y-8 mt-4 pb-20">
        {/* Title Section */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 p-6 rounded-2xl border border-white/10 shadow-lg">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              Reserve Dashboard
            </h1>
            <p className="text-white/50 text-sm font-mono tracking-widest">
              INVISIBLE ENEMIES FUND
            </p>
          </div>

          {isChief && (
            <div className="flex gap-2 mt-4 md:mt-0">
              <button
                onClick={() => { setSelectedFunction('depositFunds'); setOpenWriteFunctionDialog(true); }}
                className="flex items-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30 rounded-full px-4 py-2 transition-all"
              >
                <WalletIcon className="w-4 h-4" /> Deposit
              </button>
              <button
                onClick={() => { setSelectedFunction('withdraw'); setOpenWriteFunctionDialog(true); }}
                className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-full px-4 py-2 transition-all"
              >
                <BanknotesIcon className="w-4 h-4" /> Withdraw
              </button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ETH Balance */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
            <h2 className="text-white/60 font-mono text-sm relative z-10">ETH RESERVE</h2>
            <p className="text-4xl font-bold mt-2 relative z-10">{balance} Ξ</p>
            <p className="text-white/40 text-xs mt-1 relative z-10">
              ${(ethBalanceNum * pricesUSD.eth).toLocaleString()}
            </p>
          </div>

          {/* USDC Balance */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors"></div>
            <h2 className="text-white/60 font-mono text-sm relative z-10">USDC RESERVE</h2>
            <p className="text-4xl font-bold mt-2 relative z-10">{usdcBalance}</p>
            <p className="text-white/40 text-xs mt-1 relative z-10">
              ${(usdcBalanceNum * pricesUSD.usdc).toLocaleString()}
            </p>
          </div>

          {/* cbBTC Balance */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors"></div>
            <h2 className="text-white/60 font-mono text-sm relative z-10">BTC RESERVE</h2>
            <p className="text-4xl font-bold mt-2 relative z-10">{cbbtcBalance}</p>
            <p className="text-white/40 text-xs mt-1 relative z-10">
              ${(cbbtcBalanceNum * pricesUSD.cbbtc).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Balance History */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[400px]">
            <div className="flex items-center gap-2 mb-6">
              <ChartBarIcon className="w-5 h-5 text-white/70" />
              <h3 className="text-lg font-bold">Reserves History</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="timestamp" stroke="#666" fontSize={12} tickFormatter={(t) => t.split('/')[0] + '/' + t.split('/')[1]} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="balance" stroke="#fff" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="ETH" />
                  <Line type="monotone" dataKey="usdc" stroke="#4ade80" strokeWidth={2} dot={false} name="USDC" />
                  <Line type="monotone" dataKey="cbbtc" stroke="#fbbf24" strokeWidth={2} dot={false} name="BTC" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Beneficiaries Pie */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[400px]">
            <div className="flex items-center gap-2 mb-6">
              <ChartBarIcon className="w-5 h-5 text-white/70" />
              <h3 className="text-lg font-bold">Allocation Distribution</h3>
            </div>
            <div className="h-[300px] flex items-center justify-center">
              {renderBeneficiariesChart()}
            </div>
          </div>
        </div>

        {/* Beneficiaries List */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Authorized Beneficiaries</h3>
            {isChief && (
              <button
                onClick={() => setOpenAddBeneficiary(true)}
                className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/50 text-sm font-mono">
                  <th className="p-3">ROLE</th>
                  <th className="p-3">ADDRESS</th>
                  <th className="p-3 text-right">SPLIT</th>
                  {isChief && <th className="p-3 text-right">ACTIONS</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {beneficiaries.map((b, index) => (
                  <tr key={index} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-medium">{b.role}</td>
                    <td className="p-3 font-mono text-sm text-white/70 truncate max-w-[150px]">{b.beneficiaryAddress}</td>
                    <td className="p-3 text-right font-mono">{b.split.toString()}</td>
                    {isChief && (
                      <td className="p-3 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setCurrentBeneficiary({ index, address: b.beneficiaryAddress, split: Number(b.split), role: b.role });
                            setOpenUpdateBeneficiary(true);
                          }}
                          className="p-2 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition"
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveBeneficiary(index)}
                          className="p-2 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30 transition"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {beneficiaries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-white/40 italic">
                      No beneficiaries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 overflow-hidden">
          <h3 className="text-lg font-bold mb-6">Recent Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/50 text-sm font-mono">
                  <th className="p-3">HASH</th>
                  <th className="p-3">FROM</th>
                  <th className="p-3">TO</th>
                  <th className="p-3 text-right">VALUE</th>
                  <th className="p-3 text-right">TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {lastTransactions.map((tx, index) => (
                  <tr key={index} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono text-sm text-blue-400 truncate max-w-[100px]">
                      <a href={`https://basescan.org/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {tx.hash.substring(0, 8)}...
                      </a>
                    </td>
                    <td className="p-3 font-mono text-sm text-white/70 truncate max-w-[120px]">{tx.from}</td>
                    <td className="p-3 font-mono text-sm text-white/70 truncate max-w-[120px]">{tx.to}</td>
                    <td className="p-3 text-right font-mono text-sm">
                      {Number(formatEther(tx.value)).toFixed(4)} Ξ
                    </td>
                    <td className="p-3 text-right text-white/60 text-xs">
                      {new Date(Number(tx.timeStamp) * 1000).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {lastTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-white/40 italic">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal open={openAddBeneficiary} onClose={() => setOpenAddBeneficiary(false)} title="Add Beneficiary">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-white/60 mb-1">ROLE</label>
            <input
              type="text"
              value={newBeneficiary.role}
              onChange={e => setNewBeneficiary({ ...newBeneficiary, role: e.target.value })}
              className="w-full bg-white/10 border border-white/20 rounded p-2 text-white outline-none focus:border-white/50"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-white/60 mb-1">ADDRESS</label>
            <input
              type="text"
              value={newBeneficiary.address}
              onChange={e => setNewBeneficiary({ ...newBeneficiary, address: e.target.value })}
              className="w-full bg-white/10 border border-white/20 rounded p-2 text-white outline-none focus:border-white/50 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-white/60 mb-1">SPLIT</label>
            <input
              type="number"
              value={newBeneficiary.split}
              onChange={e => setNewBeneficiary({ ...newBeneficiary, split: Number(e.target.value) })}
              className="w-full bg-white/10 border border-white/20 rounded p-2 text-white outline-none focus:border-white/50"
            />
          </div>
          <button
            onClick={handleAddBeneficiary}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg p-3 font-bold transition-colors mt-2"
          >
            Add Beneficiary
          </button>
        </div>
      </Modal>

      <Modal open={openUpdateBeneficiary} onClose={() => setOpenUpdateBeneficiary(false)} title="Update Beneficiary">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-white/60 mb-1">ROLE</label>
            <input
              type="text"
              value={currentBeneficiary.role}
              onChange={e => setCurrentBeneficiary({ ...currentBeneficiary, role: e.target.value })}
              className="w-full bg-white/10 border border-white/20 rounded p-2 text-white outline-none focus:border-white/50"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-white/60 mb-1">ADDRESS</label>
            <input
              type="text"
              value={currentBeneficiary.address}
              onChange={e => setCurrentBeneficiary({ ...currentBeneficiary, address: e.target.value })}
              className="w-full bg-white/10 border border-white/20 rounded p-2 text-white outline-none focus:border-white/50 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-white/60 mb-1">SPLIT</label>
            <input
              type="number"
              value={currentBeneficiary.split}
              onChange={e => setCurrentBeneficiary({ ...currentBeneficiary, split: Number(e.target.value) })}
              className="w-full bg-white/10 border border-white/20 rounded p-2 text-white outline-none focus:border-white/50"
            />
          </div>
          <button
            onClick={handleUpdateBeneficiary}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg p-3 font-bold transition-colors mt-2"
          >
            Update Beneficiary
          </button>
        </div>
      </Modal>

      <Modal open={openWriteFunctionDialog} onClose={() => setOpenWriteFunctionDialog(false)} title={selectedFunction.toUpperCase()}>
        <div className="space-y-4">
          {selectedFunction === 'depositFunds' && (
            <>
              <div>
                <label className="block text-xs font-mono text-white/60 mb-1">AMOUNT (ETH)</label>
                <input
                  type="number"
                  step="0.001"
                  onChange={e => setFunctionInputs({ ...functionInputs, amount: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded p-2 text-white outline-none focus:border-white/50"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-white/60 mb-1">NOTE</label>
                <input
                  type="text"
                  onChange={e => setFunctionInputs({ ...functionInputs, note: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded p-2 text-white outline-none focus:border-white/50"
                />
              </div>
            </>
          )}

          {selectedFunction === 'sendFundsToUtilityCoDiamond' && (
            <>
              <div>
                <label className="block text-xs font-mono text-white/60 mb-1">PERCENTAGE</label>
                <input
                  type="number"
                  onChange={e => setFunctionInputs({ ...functionInputs, percentage: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded p-2 text-white outline-none focus:border-white/50"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-white/60 mb-1">NOTE</label>
                <input
                  type="text"
                  onChange={e => setFunctionInputs({ ...functionInputs, note: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 rounded p-2 text-white outline-none focus:border-white/50"
                />
              </div>
            </>
          )}

          {selectedFunction === 'withdraw' && (
            <p className="text-white/70 italic">
              Are you sure you want to trigger a withdrawal distribution to all beneficiaries?
            </p>
          )}

          <button
            onClick={handleWriteFunction}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg p-3 font-bold transition-colors mt-2"
          >
            Execute
          </button>
        </div>
      </Modal>

    </div>
  );
};

export default Reserve;
