'use client'
import { useState, useEffect, useMemo } from 'react';
import { TransactionButton, useActiveAccount, darkTheme } from 'thirdweb/react';
// import { contract } from '../primitives/TSPABI';
import { getContract } from 'thirdweb';
import { base } from 'thirdweb/chains';
import { getDiamondAddress } from '../primitives/Diamond';
import { prepareContractCall, createThirdwebClient } from 'thirdweb';
import { readContract } from 'thirdweb';
// import { getBuyWithFiatQuote } from 'thirdweb/pay';
// import { base } from 'thirdweb/chains';

function FiatMinting({ Batch, tokens, whitelist, referral, batchPrice }: { Batch: number, tokens: number, whitelist: boolean, referral: string, batchPrice: number }) {
  // const [batchPrice, setBatchPrice] = useState('0');
  const address = useActiveAccount()?.address;
  const [errorModalIsOpen, setErrorModalIsOpen] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [buttonState, setButtonState] = useState('default');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('Please Try Again');
  const [errorContext, setErrorContext] = useState<{ address?: string|null; chainId?: number } | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [tokenContractAddress, setTokenContractAddress] = useState<string | null>(null);

  const portalTheme = darkTheme({
    colors: {
      // Noir palette
      primaryButtonBg: '#ffffff',
      primaryButtonText: '#000000',
      secondaryButtonBg: 'rgba(255,255,255,0.25)',
      secondaryButtonText: '#f1f1f1',
      accentButtonBg: '#e6e6e6',
      accentText: '#111111',
      borderColor: '#ffffff',
      // Glassmorphism tint for modal/cards
      modalBg: 'rgba(0, 0, 0, 0.35)',
      tertiaryBg: 'rgba(255,255,255,0.18)',
      primaryText: '#ffffff',
      secondaryText: '#e0e0e0',
    },
    fontFamily: 'Inter, system-ui, sans-serif',
  });

  const [contractAddress, setContractAddress] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const addr = await getDiamondAddress();
        setContractAddress(addr);
      } catch {}
    })();
  }, []);
  // dynamic contract will be created only once clientId and address are ready

  // Print the Batch number
  // console.log('Batch:', Batch);
  
  // const isActiveStatus = readContract({
  //   contract: contract,
  //   method: "isActive",
  // });
  
  // const isWLActiveStatus = readContract({
  //   contract: contract,
  //   method: "isWLActive",
  // });
  
  useEffect(() => {
    // defer until after clientId state is declared below
  }, []);

  // fetch batch info once we have both client id and address
  useEffect(() => {
    if (!contractAddress) return;
    let isMounted = true;
    (async () => {
      try {
        // typing for thirdweb readContract may be narrow; cast to any to satisfy TS
        // fetch client id on demand (avoids ordering issues)
        const resp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
        const { clientId: cid } = await resp.json();
        if (!cid) return;
        const dynamicClient = createThirdwebClient({ clientId: cid });
        const contract = getContract({ client: dynamicClient, chain: base, address: contractAddress! });
        const info = await (readContract as any)({
          contract,
          method: "getBatchInfo",
          params: [BigInt(Batch)],
        });
        if (!isMounted) return;
        // optional: handle info here if needed
      } catch {}
    })();
    return () => { isMounted = false; };
  }, [contractAddress, Batch]);

  useEffect(() => {
    console.log('Batch Price:', batchPrice);
  }, [batchPrice]);

  const makeAPICall = async (url: string | URL | Request, requestBody: {
      referralCode: any;
      customerWallet: string; tokenAmount: string; status: string;
    }) => {
    try {
      // console.log(JSON.stringify(requestBody));
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const result = await response.json();
      // console.log('API call result:', result);
    } catch (error) {
      console.error('Error making API call:', error);
    }
  };

  const confirmedURL = 'https://mint.thelochnessbotanicalsociety.com/referralPostback.php';
  const [clientId, setClientId] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
        const json = await resp.json();
        if (json?.clientId) setClientId(json.clientId);
      } catch {}
    })();
  }, []);
  const client = useMemo(() => {
    if (typeof window === 'undefined') {
      return null as any;
    }
    return clientId ? createThirdwebClient({ clientId }) : null as any;
  }, [clientId]);

  const buildTransaction = async () => {
    if (!address) throw new Error('No wallet connected');
    if (!clientId || !contractAddress) throw new Error('Mint not ready');
    const dynamicClient = createThirdwebClient({ clientId });
    // Minimal ABI for mint(amount) payable
    const txAbi = [
      { inputs: [{ name: 'amount', type: 'uint256' }], name: 'mint', outputs: [], stateMutability: 'payable', type: 'function' },
    ];
    const contract = getContract({ client: dynamicClient, chain: base, address: contractAddress, abi: txAbi as any });
    // Contract expects only the amount; active batch is handled on-chain
    const params: [bigint] = [BigInt(tokens)];
    const valueInWei = BigInt(batchPrice) * BigInt(tokens);
    return (prepareContractCall as any)({
      contract,
      method: 'mint',
      params,
      value: valueInWei,
    });
  };

  function formatMintError(err: any) {
    const raw = err?.message || String(err);
    const lowered = raw.toLowerCase();
    if (lowered.includes('user rejected')) {
      setErrorTitle('Transaction Rejected');
      return 'You cancelled the transaction in your wallet.';
    }
    if (lowered.includes('insufficient funds') || lowered.includes('insufficient')) {
      setErrorTitle('Insufficient Funds');
      return 'Your wallet balance is not enough to cover mint price and fees.';
    }
    if (lowered.includes('not active') || lowered.includes('inactive')) {
      setErrorTitle('Mint Not Active');
      return 'Minting is currently disabled for this collection.';
    }
    if (lowered.includes('revert') || lowered.includes('execution reverted')) {
      setErrorTitle('Contract Reverted');
      return 'The contract reverted this transaction. Please verify mint status and parameters.';
    }
    setErrorTitle('Please Try Again');
    return raw;
  }

  // Rely on thirdweb's built-in Pay modal for insufficient funds

  if (!clientId || !contractAddress) {
    return (
      <div className="flex items-center justify-center py-2 px-6 rounded-full ring-1 ring-inset ring-white/30 bg-black/50 text-white opacity-70">
        Preparing mint…
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-0 sm:p-1 w-full">
      {client ? (
        <TransactionButton
          className={`transaction-button bg-white text-black hover:bg-white/90 py-2 px-6 rounded-full ring-1 ring-inset ring-white/50 transition-colors duration-200 shadow-md shadow-black/60 hover:shadow-black/80 font-semibold tracking-wide`}
          transaction={buildTransaction}
          theme={portalTheme}
          onTransactionSent={(resp: any) => {
            try {
              const hash = resp?.transactionHash || resp?.transaction?.hash || resp?.hash;
              if (hash) setTransactionHash(hash);
            } catch {}
          }}
          onTransactionConfirmed={(receipt: any) => {
            try {
              const hash = receipt?.transactionHash || receipt?.transaction?.hash || receipt?.hash;
              if (hash) setTransactionHash(hash);
            } catch {}
            setModalIsOpen(true);
            // Post referral confirmation
            try {
              if (address) {
                makeAPICall(confirmedURL, {
                  referralCode: referral,
                  customerWallet: address,
                  tokenAmount: String(tokens),
                  status: '1',
                } as any);
              }
            } catch {}
          }}
          onError={(e: any) => {
            setErrorContext({ address: contractAddress, chainId: 8453 });
            setErrorMessage(formatMintError(e));
            setErrorModalIsOpen(true);
          }}
        >
          Mint
        </TransactionButton>
      ) : (
        <div className="flex items-center justify-center py-2 px-6 rounded-full ring-1 ring-inset ring-white/30 bg-black/60 text-white opacity-80 w-full text-center">
          Preparing mint…
        </div>
      )}
        {modalIsOpen && (
          <div 
            className="fixed z-10 inset-0 rounded-lg overflow-y-auto flex items-center justify-center"
            style={{
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            }}
          >            
            <div 
              className="relative rounded-lg shadow-xl w-full md:max-w-md max-h-[90vh] overflow-y-auto mx-auto flex flex-col items-center justify-center bg-white/10"
            >
              <div className="absolute top-0 w-full">
                <video autoPlay muted loop className="w-full h-60 rounded-t-lg object-cover">
                  <source src="/minted2.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <button
                  onClick={() => setModalIsOpen(false)}
                  className="absolute top-0 right-0 m-4 bg-white/20 text-white rounded-full p-2"
                  style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="relative pb-2 translate-y-10 flex flex-col items-center justify-center space-y-6 p-6">
                <h2 className="text-center text-gray-100 text-2xl font-bold">Transaction Complete</h2>
                <div className="flex flex-col space-y-4 items-center">
                  <p className="text-center text-gray-100 text-lg">
                    Congratulations on minting an NFT by
                  </p>
                  <img src="/Medallions/NFTPD.png" alt="NFTPD Medallion" className="w-32 h-auto mx-auto block" />
                </div>
                {transactionHash && (
                  <div className="flex space-x-4 overflow-hidden p-2">
                    <a 
                      href={`https://basescan.org/tx/${transactionHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-32 h-12 text-xs font-medium leading-6 text-center text-white uppercase transition bg-white/20 rounded shadow ripple hover:shadow-lg hover:bg-white/30 focus:outline-none"
                      style={{
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      }}
                    >
                      <img src="/basescan.svg" alt="Basescan" className="w-auto h-7 p-1" />
                    </a>
                    <a 
                      href={`https://digibazaar.io/base/collection/${tokenContractAddress}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-32 h-12 text-xs font-medium leading-6 text-center text-white uppercase transition bg-white/20 rounded shadow ripple hover:shadow-lg hover:bg-white/30 focus:outline-none"
                      style={{
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      }}
                    >
                      <img src="/dbw.png" alt="DigiBazaar" className="w-auto h-9 p-1" />
                    </a>
                  </div>
                )}
                {/* <EsperanzaC /> */}
              </div>
              {/* <div className="absolute w-full overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 rounded-l-md flex items-center w-full sm:px-6 sm:py-2" style={{ backgroundColor: 'rgba(0, 255, 0, 0.5)' }}>
                  <div className="flex justify-between items-center w-full">
                    <div className="whitespace-nowrap overflow-hidden w-3/4" style={{ animation: 'marquee 10s linear infinite' }}>
                      <span className="block inline-block pb-2">Speak to Esperanza to begin your journey!</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 sm:w-8 sm:h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>
              </div> */}
              <style jsx>{`
                @keyframes marquee {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-100%); }
                }
              `}</style>
            </div>
          </div>
        )}
        {errorModalIsOpen && (
          <div 
            className="fixed z-10 inset-0 rounded-lg overflow-y-auto flex items-center justify-center"
            style={{
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >            
            <div 
              className="relative rounded-lg shadow-xl w-4/5 md:max-w-md mx-auto p-6 flex flex-col items-center justify-center bg-white/10 backdrop-filter backdrop-blur-lg"
            >
              <div className="h-12 w-12 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <h2 className="text-center text-gray-100 text-2xl font-bold">{errorTitle}</h2>
              <div className="text-center text-gray-100 text-sm mt-2 space-y-1">
                {errorContext?.address && (
                  <div className="opacity-80">Contract: <span className="font-mono">{errorContext.address}</span></div>
                )}
                {errorContext?.chainId && (
                  <div className="opacity-80">Network: <span className="font-mono">Base (chainId {errorContext.chainId})</span></div>
                )}
              </div>
              <p className="text-center text-gray-100 text-base mt-3">{errorMessage}</p>
              <div className="mt-4 text-white/80 text-xs opacity-80">
                If this persists, check mint status, price, and your wallet balance, then try again.
              </div>
              <button
                onClick={() => setErrorModalIsOpen(false)}
                className="block w-full py-2 rounded-md bg-white/20 text-white cursor-pointer mt-4"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
  );
}

export default FiatMinting;
