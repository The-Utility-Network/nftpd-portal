'use client';

import { useSetActiveWallet, ConnectButton, darkTheme } from 'thirdweb/react';
import { createWallet, inAppWallet, walletConnect } from 'thirdweb/wallets';
import { useEffect, useState } from 'react';
import { createThirdwebClient } from 'thirdweb';
import { base } from 'thirdweb/chains';

const wallets = [
  inAppWallet({
    auth: {
      options: [
        "google",
        "discord",
        "telegram",
        "farcaster",
        "email",
        "x",
        "passkey",
        "phone",
        "github",
        "steam",
        "twitch",
        "line",
        "apple",
        "facebook",
        "tiktok",
        "coinbase",
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("io.rabby"),
  createWallet("com.trustwallet.app"),
  createWallet("global.safe"),
];

export default function Wallet() {
  const setActiveAccount = useSetActiveWallet();
  const [walletAddress, setWalletAddress] = useState(null);
  const [client, setClient] = useState<any>(null);

  // Create client in-browser from server-provided clientId
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/thirdweb/client', { cache: 'no-store' });
        const json = await resp.json();
        if (json?.clientId) {
          setClient(createThirdwebClient({ clientId: json.clientId }));
        }
      } catch (e) {
        console.error('Error creating thirdweb client:', e);
      }
    })();
  }, []);

  const handleConnect = async (account: any) => {
    await setActiveAccount(account);
    setWalletAddress(account);
  };

  if (!client) {
    return <div>Loading...</div>; // Add a loading state while the client is being fetched
  }

  return (
      <ConnectButton
        client={client}
        wallets={wallets}
        accountAbstraction={{
          chain: base,
          sponsorGas: true,
        }}
        theme={darkTheme({
          colors: {
            accentText: '#ffffff',
            accentButtonBg: '#e6e6e6',
            primaryButtonBg: 'rgba(255,255,255,0.15)',
            primaryButtonText: '#ffffff',
            secondaryButtonText: '#f1f1f1',
            secondaryText: '#e0e0e0',
            modalBg: 'rgba(0,0,0,0.5)',
            connectedButtonBg: 'rgba(255,255,255,0.15)',
            borderColor: '#ffffff',
          },
        })}
        connectModal={{
          size: 'wide',
          titleIcon:
            '/Medallions/NFTPD.png',
          welcomeScreen: {
            title: 'Mint an RWA today!',
            subtitle: 'Connect a wallet to build your portfolio',
            img: {
              src: '/Medallions/NFTPD.png',
              width: 150,
              height: 150,
            },
          },
          showThirdwebBranding: false,
        }}
        onConnect={handleConnect}
      />
  );
}
