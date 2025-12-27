'use client'
import Image from 'next/image';
import { ethers } from 'ethers';
import axios from 'axios';
import { useActiveAccount } from "thirdweb/react";
import { useState, useEffect, useRef, ChangeEvent } from "react";
import FiatMinting from "./fiatMintButton";
import { getContract, readContract, createThirdwebClient } from 'thirdweb';
import { base } from 'thirdweb/chains';
import { getDiamondAddress } from '../primitives/Diamond';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import MinusIcon from '@heroicons/react/24/outline/MinusIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';

// Alchemy API configuration (handled by API routes)
const ALCHEMY_API_V2_URL = 'https://base-mainnet.g.alchemy.com/v2';
const ALCHEMY_API_V3_URL = 'https://base-mainnet.g.alchemy.com/nft/v3';
const mintOpeningSoonDefault = false;

// Minimal ABI bits we need for reads
const minimalAbi = [
	{ inputs: [], name: 'totalSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
	{ inputs: [{ name: 'batchId', type: 'uint256' }], name: 'getBatchInfo', outputs: [
		{ name: 'maxSupply', type: 'uint256' },
		{ name: 'currentSupply', type: 'uint256' },
		{ name: 'price', type: 'uint256' },
		{ name: 'isActive', type: 'bool' },
	], stateMutability: 'view', type: 'function' },
];

async function getDynamicContract() {
	const resp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
	const { clientId } = await resp.json();
	const client = createThirdwebClient({ clientId });
	const address = await getDiamondAddress();
	return getContract({ client, chain: base, address, abi: minimalAbi as any });
}

async function getCurrentSupply() {
	const contract = await getDynamicContract();
	const totalSupply = await readContract({ contract, method: 'totalSupply' as any });
	return parseInt((totalSupply as any).toString(), 10);
}

async function getBatchDetails(batchId: bigint) {
	const contract = await getDynamicContract();
	const batch: any = await readContract({ contract, method: 'getBatchInfo' as any, params: [batchId] });
	return {
		maxSupply: parseInt(batch[0].toString(), 10),
		currentSupply: parseInt(batch[1].toString(), 10),
		price: parseInt(batch[2].toString(), 10),
		isActive: batch[3],
	};
}

export default function Form() {
  const activeAccount = useActiveAccount();
  const accountDisplay = activeAccount 
    ? `${activeAccount.address.slice(0, 4)}...${activeAccount.address.slice(-4)}` 
    : '';

  // State variables
  const [batch, setBatch] = useState<bigint | null>(null);
  const [tokens, setTokens] = useState<number>(1);
  const [pricePerToken, setPricePerToken] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string>('');
  const [whitelist, setWhitelist] = useState<boolean>(false);
  const [currentSupply, setCurrentSupply] = useState<number>(0);
  const [nfts, setNfts] = useState<any[]>([]);
  const [collectionDetails, setCollectionDetails] = useState<any>(null);
  const [batches, setBatches] = useState<BatchDetails[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(true);
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [serverConfig, setServerConfig] = useState<{ diamondAddress: string | null; mintSoon: boolean } | null>(null);

  // Ref for scrolling to the top
  const formRef = useRef<HTMLDivElement>(null);

  // Use useRef to manage the tap sound effect
  const tapSoundEffectRef = useRef<HTMLAudioElement | null>(null);

  // Function to scroll to the top of the form
  const scrollToTop = () => {
    if (formRef.current) {
      formRef.current.scrollTo(0, 0);
    }
  };

  // Fetch server-side config
  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch('/api/config', { cache: 'no-store' });
        const json = await resp.json();
        setServerConfig({ diamondAddress: json.diamondAddress, mintSoon: !!json.mintSoon });
      } catch (e) {
        setServerConfig({ diamondAddress: null, mintSoon: mintOpeningSoonDefault });
      }
    };
    load();
  }, []);

  // Initialize tap sound effect
  useEffect(() => {
    try {
      tapSoundEffectRef.current = new Audio('/static/sounds/tap.mp3');
    } catch (error) {
      console.error('Error loading tap sound effect:', error);
    }
  }, []);

  // Fetch NFTs and collection details using Alchemy API (with robust owner/floor fallbacks)
  useEffect(() => {
    async function fetchNFTs() {
      try {
        if (!serverConfig?.diamondAddress) return;

        const addr = await getDiamondAddress(); // always use live NFTPD diamond, not cached UI state
        const nftResp = await fetch(`/api/alchemy/collection?address=${addr}`, { cache: 'no-store' });
        const nftResponse = await nftResp.json();

        // Transform Alchemy V3 data to a simple gallery structure
        const list = Array.isArray(nftResponse?.nfts) ? nftResponse.nfts : [];
        const alchemyNfts = list.map((nft: any) => {
          const tokenId = nft?.tokenId ?? nft?.id?.tokenId;
          const name = nft?.name || nft?.title || `Token #${tokenId}`;
          const image = nft?.image?.originalUrl || nft?.image?.cachedUrl || nft?.image?.thumbnailUrl || nft?.media?.[0]?.gateway || nft?.image?.url;
          return {
            token: { tokenId, name, image }
          };
        });

        setNfts(alchemyNfts);

        // Collection metadata
        const mdResp = await fetch(`/api/alchemy/metadata?address=${addr}`, { cache: 'no-store' });
        const contractMetadata = await mdResp.json();

        // Owners (distinct)
        let ownerCount: number | string = '—';
        try {
          const ownersResp = await fetch(`/api/alchemy/owners?address=${addr}`, { cache: 'no-store' });
          if (ownersResp.ok) {
            const ownersJson = await ownersResp.json();
            // Expect an array of owner addresses or an object with owners field
            const ownersArr = Array.isArray(ownersJson) ? ownersJson : (ownersJson?.ownerAddresses || ownersJson?.owners || []);
            if (Array.isArray(ownersArr)) {
              const set = new Set<string>(ownersArr.map((x: any) => String(x).toLowerCase()));
              ownerCount = set.size;
            }
          }
        } catch {}

        // Floor price via Alchemy only (with env fallback)
        let floorEth: number | null = null;
        try {
          const alt = await fetch(`/api/alchemy/floor?address=${addr}`, { cache: 'no-store' });
          if (alt.ok) {
            const json = await alt.json();
            const val = Number(json?.floorPrice?.openSea?.floorPrice || json?.floor || json?.price?.eth);
            if (!Number.isNaN(val) && val > 0) floorEth = val;
          }
        } catch {}

        // Prefer on-chain principle count via totalSupply-like method if exposed; otherwise keep metadata
        // fallback size only as a last resort when API empty
        const fallbackSize = Number(process.env.NEXT_PUBLIC_COLLECTION_SIZE || 4000);
        const fallbackFloor = process.env.NEXT_PUBLIC_FLOOR_PRICE ? Number(process.env.NEXT_PUBLIC_FLOOR_PRICE) : null;
        const collectionData = {
          ownerCount,
          supply: contractMetadata?.contractMetadata?.totalSupply ?? fallbackSize,
          floorAsk: {
            price: {
              amount: { eth: floorEth ?? fallbackFloor },
            },
          },
          name: contractMetadata?.contractMetadata?.name || 'NFTPD',
        };

        setCollectionDetails(collectionData);

      } catch (error: any) {
        console.error('Error fetching NFTs or collection data:', error);
        setError('Failed to load NFTs or collection details. Some features may be limited.');
      }
    }

    if (serverConfig?.diamondAddress) {
      fetchNFTs();
    }
  }, [serverConfig?.diamondAddress]);


  // Define BatchDetails interface
  interface BatchDetails {
    id: number;
    maxSupply: number;
    currentSupply: number;
    price: number;
    isActive: boolean;
  }

  // Fetch batches
  useEffect(() => {
    async function fetchBatches() {
      try {
        let i = 1;
        const diamondAddress = await getDiamondAddress();
        if (!diamondAddress) {
          throw new Error("Diamond address not found.");
        }
        const twResp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
        const { clientId } = await twResp.json();
        if (!clientId) throw new Error('thirdweb client not configured');
        const client = createThirdwebClient({ clientId });
        const diamondContract = getContract({ client, chain: base, address: diamondAddress, abi: minimalAbi as any });
        let batchArr: any = await (readContract as any)({ contract: diamondContract, method: 'getBatchInfo', params: [BigInt(i)] });
        const batchDetailsArray: BatchDetails[] = [];
    
        while (batchArr && Number(batchArr[0] || 0) !== 0) {
          batchDetailsArray.push({
            id: i,
            maxSupply: Number(batchArr[0] || 0),
            currentSupply: Number(batchArr[1] || 0),
            price: Number(batchArr[2] || 0),
            isActive: Boolean(batchArr[3]),
          });
          i++;
          const nextArr: any = await (readContract as any)({ contract: diamondContract, method: 'getBatchInfo', params: [BigInt(i)] });
          if (Number(nextArr?.[0] || 0) === 0) {
            break;
          }
          batchArr = nextArr;
        }
        console.log(batchDetailsArray);
        // Print batch price
        if (batchDetailsArray.length > 0) {
          console.log('Batch 1 Price (ETH wei):', batchDetailsArray[0].price);
        }
    
        setBatches(batchDetailsArray);
    
        // Find the first active batch and set it as the current batch
        const firstActiveBatch = batchDetailsArray.find(batch => batch.isActive && batch.currentSupply < batch.maxSupply);
        if (firstActiveBatch) {
          setBatch(BigInt(firstActiveBatch.id));
        }
      } catch (error) {
        console.error('Error fetching batches:', error);
        setError('Failed to load batches.');
      } finally {
        setIsLoadingBatches(false);
      }
    }
  
    fetchBatches();
  }, []);

  // Fetch current supply
  useEffect(() => {
    let isMounted = true;

    async function fetchCurrentSupply() {
      try {
        const diamondAddress = await getDiamondAddress();
        if (!diamondAddress) {
          throw new Error("Diamond address not found.");
        }
        const twResp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
        const { clientId } = await twResp.json();
        if (!clientId) throw new Error('thirdweb client not configured');
        const client = createThirdwebClient({ clientId });
        const diamondContract = getContract({ client, chain: base, address: diamondAddress, abi: minimalAbi as any });
        const totalSupply = await (readContract as any)({ contract: diamondContract, method: 'totalSupply' });
        if (isMounted) setCurrentSupply(parseInt((totalSupply as any).toString(), 10));
      } catch (error) {
        if (isMounted) {
          console.error("Error getting current supply:", error);
          setError('Failed to get current supply.');
        }
      }
    }

    fetchCurrentSupply();

    return () => { isMounted = false; };
  }, []);

  // Fetch price per token based on selected batch
  useEffect(() => {
    async function fetchPricePerToken() {
      if (batch === null) return;

      setIsLoadingPrice(true);
      try {
        const diamondAddress = await getDiamondAddress();
        if (!diamondAddress) {
          throw new Error("Diamond address not found.");
        }
        const twResp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
        const { clientId } = await twResp.json();
        if (!clientId) throw new Error('thirdweb client not configured');
        const client = createThirdwebClient({ clientId });
        const diamondContract = getContract({ client, chain: base, address: diamondAddress, abi: minimalAbi as any });
        const details: any = await (readContract as any)({ contract: diamondContract, method: 'getBatchInfo', params: [batch] });
        if (details) {
          setPricePerToken(Number(details[2] || 0));
        } else {
          setPricePerToken(0);
          console.warn(`No details found for batch ${batch.toString()}`);
        }
      } catch (error) {
        console.error("Error fetching price per token:", error);
        setError('Failed to fetch price per token.');
        setPricePerToken(0);
      } finally {
        setIsLoadingPrice(false);
      }
    }

    if (batch !== null) {
      fetchPricePerToken();
    }
  }, [batch]);

  // Handle whitelist checkbox change
  const handleWhitelistChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (tapSoundEffectRef.current) {
      tapSoundEffectRef.current.play().catch((error) => {
        console.error('Error playing tap sound:', error);
      });
    }
    setWhitelist(event.target.checked);
  };

  // Increment number of tokens
  const incrementTokens = () => {
    if (tapSoundEffectRef.current) {
      tapSoundEffectRef.current.play().catch((error) => {
        console.error('Error playing tap sound:', error);
      });
    }
    setTokens(prevTokens => prevTokens + 1);
  };

  // Decrement number of tokens
  const decrementTokens = () => {
    if (tapSoundEffectRef.current) {
      tapSoundEffectRef.current.play().catch((error) => {
        console.error('Error playing tap sound:', error);
      });
    }
    setTokens(prevTokens => Math.max(1, prevTokens - 1));
  };

  // Handle batch selection change
  function handleBatchChange(event: ChangeEvent<HTMLSelectElement>): void {
    const selectedBatchId = Number(event.target.value);
    setBatch(BigInt(selectedBatchId));
  }

  // Utility function to handle IPFS URLs and other external URLs
  const getImageUrl = (url: string): string => {
    if (!url) return '/fallback-image.png'; // Fallback if URL is empty

    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    // Handle other protocols or return the URL as is
    return url;
  };

  return (
    <div
      ref={formRef}
      className="isolate space-y-4 sm:space-y-2 rounded-2xl shadow-lg bg-black/50 p-4 sm:p-6 w-full md:w-3/4 lg:w-1/2 mx-auto"
      style={{
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        maxHeight: "75vh", // Ensures it doesn't take the entire screen height
        overflowY: "auto", // Makes it scrollable when needed
      }}
    >
      {/* Display Error Message */}
      {error && (
        <div className="bg-white/20 text-white p-2 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Account, Minted Tokens, and Batches Information */}
      <div className="relative rounded-xl px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-white/20 focus-within:z-10 focus-within:ring-2 focus-within:ring-white/40 flex justify-between items-center">
        {/* Account Information */}
        <div>
          <label htmlFor="account" className="block text-sm font-medium text-white/80">
            Account
          </label>
          <div
            id="account"
            className="block w-full border-0 bg-transparent text-white placeholder:text-white/40 sm:text-base"
          >
            {activeAccount ? accountDisplay : "--"}
          </div>
        </div>

        {/* Minted Tokens Information */}
        <div className="flex flex-col justify-center items-center">
          <label htmlFor="mintedTokens" className="block text-sm font-medium text-white/80">
            Minted Tokens
          </label>
          <div
            id="mintedTokens"
            className="block w-full border-0 bg-transparent text-center text-white placeholder:text-white/40 sm:text-base"
          >
            {/* {currentSupply} / {collectionDetails?.supply ?? '—'} */}
            {currentSupply} / {collectionDetails?.supply ?? 4000}
          </div>
        </div>

        {/* Batches Indicator */}
        <div>
          <label htmlFor="batches" className="block text-sm font-medium text-white/80 text-right">
            Batches
          </label>
          <div className="flex space-x-2 py-2 sm:pl-2 md:pl-4">
            {batches.map((batchItem) => (
              <div
                key={batchItem.id}
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: batchItem.isActive && batchItem.currentSupply < batchItem.maxSupply ? "#f54029" : "lightGreen" }}
                title={`Batch ${batchItem.id} ${batchItem.currentSupply === batchItem.maxSupply ? '(Sold Out)' : batchItem.isActive ? '' : '(Coming Soon)'}`}
              ></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* NFT Gallery */}
      <div 
        className="flex space-x-4 overflow-x-auto py-2"
      >
        {nfts.map((nft, index) => (
                        <a
                key={index}
                href={serverConfig?.diamondAddress ? `https://digibazaar.io/base/asset/${serverConfig.diamondAddress}:${nft.token.tokenId}?tab=info` : '#'}
                target="_blank"
                rel="noopener noreferrer"
            className="flex-shrink-0 flex flex-col items-center justify-center bg-black rounded-xl p-2 shadow-lg transition-transform transform hover:scale-105 w-40 sm:w-48 md:w-56 lg:w-64"
          >
            {/* Using Next.js Image for optimization */}
            <img 
              src={getImageUrl(nft.token.image) || '/fallback-image.png'} 
              alt={nft.token.name || `NFT ${nft.token.tokenId}`} 
              width="160" 
              height="160" 
              className="w-full h-full object-cover rounded-lg"
              loading="lazy"
              onError={(e) => {
                // Fallback to a default image if the original fails to load
                (e.target as HTMLImageElement).src = '/fallback-image.png';
              }}
            />
            <div 
              className="text-white mt-2 text-center truncate w-full" 
              title={nft.token.name}
            >
              {nft.token.name}
            </div>
            <div className="flex justify-between w-full px-2 mt-1">
              <span className="text-white/80 text-sm flex items-center">
                <span className="h-2 w-2 bg-green-500 rounded-full mr-1"></span>Live
              </span>
              <span className="text-white/80 text-sm">ID: {nft.token.tokenId}</span>
            </div>
          </a>
        ))}
      </div>
  
      {/* Collection Details */}
      {collectionDetails && (
        <div className="flex flex-col justify-between items-center mt-4 px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-white/20 rounded-xl">
          <div className="flex justify-between w-full">
            <div className="text-white/90">
              <span>Holders: {collectionDetails.ownerCount}</span>
            </div>
            <div className="text-white/90">
              <span>Collection Size: {collectionDetails.supply}</span>
            </div>
            <div className="text-white/90">
              <span>
                Floor Price: {collectionDetails.floorAsk?.price?.amount?.eth 
                  ? `${Number(collectionDetails.floorAsk.price.amount.eth).toFixed(6)} ETH`
                  : "N/A"}
              </span>
            </div>
          </div>

          {/* Button Container (Vertical Stack) */}
          <div className="flex flex-col w-full justify-center mt-4 space-y-2">
            {/* DigiBazaar Button */}
            <a
              href={serverConfig?.diamondAddress ? `https://digibazaar.io/base/collection/${serverConfig.diamondAddress}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-white/20 text-white py-2 px-6 rounded-full hover:bg-opacity-60 ring-1 ring-inset ring-white/20 hover:ring-white/40 flex items-center space-x-2 transition-colors duration-200 justify-center min-w-0"
            >
              <img src="/dbw.png" alt="DigiBazaar Logo" className="h-6" />
              <span 
                className="text-white/80 truncate flex-0" 
                title={`Shop the Collection: ${collectionDetails.name}`}
              >
                Shop the Collection: {collectionDetails.name}
              </span>
            </a>

            {/* Etherscan Button */}
            <a
              href={serverConfig?.diamondAddress ? `https://basescan.org/address/${serverConfig.diamondAddress}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-white/20 text-white py-2 px-6 rounded-full hover:bg-opacity-60 ring-1 ring-inset ring-white/20 hover:ring-white/40 flex items-center space-x-2 transition-colors duration-200 justify-center"
            >
              <img src="/basescan.svg" alt="Etherscan Logo" className="h-6" />
              <span className="text-white/80">View on Basescan</span>
            </a>
          </div>
        </div>
      )}

      {/* Batch Selection */}
      <div className="relative rounded-xl px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-white/20 focus-within:z-10 focus-within:ring-2 focus-within:ring-white/40">
          <label htmlFor="batch" className="block text-center text-sm font-medium text-white/80">
              Batch
          </label>
          <div className="relative" onClick={() => {
            if (tapSoundEffectRef.current) {
              tapSoundEffectRef.current.play().catch((error) => {
                console.error('Error playing tap sound:', error);
              });
            }
          }}>
            <select
              name="batch"
              id="batch"
              className="block w-full border-0 bg-black/60 text-white placeholder:text-white/40 focus:ring-0 sm:text-base rounded-lg appearance-none pr-8"
              onChange={handleBatchChange}
              value={batch !== null ? batch.toString() : ''}
              disabled={isLoadingBatches}
            >
              <option value="" disabled>Select a Batch</option>
              {batches.map((batchItem) => (
                <option 
                  key={batchItem.id} 
                  value={batchItem.id} 
                  disabled={!batchItem.isActive || batchItem.currentSupply >= batchItem.maxSupply}
                >
                  {`Batch ${batchItem.id} ${batchItem.currentSupply >= batchItem.maxSupply ? '(Sold Out)' : batchItem.isActive ? '' : '(Coming Soon)'}`}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
              <ChevronDownIcon className="h-5 w-5" />
            </div>
          </div>
          {isLoadingBatches && (
            <div className="text-white/80 text-sm mt-2">Loading batches...</div>
          )}
      </div>

      {/* Number of Tokens */}
      <div className="relative rounded-xl px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-white/20 focus-within:z-10 focus-within:ring-2 focus-within:ring-white/40">
          <label htmlFor="tokens" className="block text-center text-sm font-medium text-white/80">
              Number of Tokens
          </label>
          <div className="relative">
              <input
                  type="number"
                  name="tokens"
                  id="tokens"
                  className="block w-full border-0 bg-black/60 text-white placeholder:text-white/40 focus:ring-0 sm:text-base rounded-lg text-center"
                  placeholder="1"
                  value={tokens}
                  onChange={e => {
                    const value = Number(e.target.value);
                    if (value >= 1 && value <= 10) { // Assuming a max of 10 tokens
                      setTokens(value);
                    }
                  }}
                  min={1}
                  max={10}
              />
              <button
                  type="button"
                  className="absolute top-0 left-0 mt-2.5 ml-2 text-white/80 hover:text-white"
                  onClick={decrementTokens}
                  aria-label="Decrement Tokens"
              >
                  <MinusIcon className="h-5 w-5" />
              </button>
              <button
                  type="button"
                  className="absolute top-0 right-0 mt-2.5 mr-2 text-white/80 hover:text-white"
                  onClick={incrementTokens}
                  aria-label="Increment Tokens"
              >
                  <PlusIcon className="h-5 w-5" />
              </button>
          </div>
      </div>

      {/* Referral Code and Price */}
      <div className="flex justify-between items-stretch">
          <div className="flex-grow relative rounded-xl px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-white/20 focus-within:z-10 focus-within:ring-2 focus-within:ring-white/40 w-1/2 mr-2">
            <label htmlFor="referral" className="block text-center text-sm font-medium text-white/80">
              Referral Code
            </label>
            <input
              id="referral"
              className="block w-full h-auto border-0 bg-black/60 text-white placeholder:text-white/40 focus:ring-0 sm:text-base rounded-lg"
              placeholder="Enter Code"
              value={referralCode}
              onChange={e => setReferralCode(e.target.value)}
            />
          </div>
          <div className="flex-grow relative rounded-xl px-3 pb-1.5 pt-2.5 ring-1 ring-inset ring-white/20 w-1/2 ml-2">
              <label htmlFor="price" className="block text-center text-sm font-medium text-white/80">
                  Price
              </label>
              <input 
                  id="price" 
                  className="block w-full h-auto text-white sm:text-base rounded-lg font-bold bg-black/60 p-2 pr-2 text-right"
                  type="text"
                  readOnly
                  value={
                    isLoadingPrice 
                      ? 'Loading...'
                      : pricePerToken > 0 
                        ? `${ethers.formatEther(BigInt(tokens * pricePerToken))} ETH` 
                        : 'N/A'
                  }
              />
              <img src="/eth.svg" alt="Ethereum symbol" className="absolute top-1/2 translate-y-1/4 left-6 transform h-4 w-4 filter invert" />
          </div>
      </div>

      {/* Whitelist Checkbox */}
      <div className="relative rounded-lg flex items-center px-3 pb-1.5 pt-1.5 ring-1 ring-inset ring-white/20 focus-within:z-10 focus-within:ring-2 focus-within:ring-white/40">
          <input
              type="checkbox"
              name="whitelist"
              id="whitelist"
              className="h-4 w-4 rounded border-white/40 text-white focus:ring-0 rounded-lg"
              checked={whitelist}
              onChange={handleWhitelistChange}
          />
          <label htmlFor="whitelist" className="ml-3 block text-sm font-medium text-white/80">
              Whitelist
          </label>
      </div>

      {/* Minting Button */}
      <div className="flex flex-row justify-center flex-nowrap">
        <div className="w-auto p-2 text-xs sm:text-sm md:text-base">
          <FiatMinting 
            Batch={batch !== null ? Number(batch) : 0} 
            tokens={tokens} 
            whitelist={whitelist} 
            referral={referralCode} 
            batchPrice={pricePerToken}
          />
        </div>
      </div>
    </div>
  );
}
