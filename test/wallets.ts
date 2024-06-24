import Avalanche from 'avalanche';

import { CosmosNetworks } from '@stakekit/common';
import { getAvalancheWallet } from '../src/avalanche';
import { getCeloWallet } from '../src/celo';
import { WalletOptions } from '../src/constants';
import { getStargateWallet } from '../src/cosmos';
import { getEthereumWallet } from '../src/ethereum';
import { getNearWallet, nearKeyPairToAddress } from '../src/near';
import { getSolanaWallet } from '../src/solana';
import { getTezosWallet } from '../src/tezos';
// import { getBinanceChainWallet } from '../src/binance';

export const resolvers = {
  evm: async (options: WalletOptions) => {
    const wallet = await getEthereumWallet(options);
    return wallet.getAddress();
  },

  // binanceChain: async (options: WalletOptions) => {
  //   const w = await getBinanceChainWallet(options);
  //   if (typeof w === 'string') {
  //     return w;
  //   }
  //   return w.address;
  // },

  celo: async (options: WalletOptions) => {
    const wallet = await getCeloWallet(options);
    return await wallet.getAddress();
  },

  cosmos: async (
    prefix: string,
    options: WalletOptions,
    network: CosmosNetworks,
  ) => {
    const wallet = await getStargateWallet(prefix, options, network);
    return (await wallet.getAccounts())[0].address;
  },

  near: async (options: WalletOptions) => {
    const wallet = await getNearWallet(options);
    return nearKeyPairToAddress(wallet);
  },

  tezos: async (options: WalletOptions) => {
    const wallet = await getTezosWallet(options);
    return wallet.publicKeyHash();
  },

  solana: async (options: WalletOptions) => {
    const wallet = await getSolanaWallet(options);
    return (await wallet.getPublicKey()).toBase58();
  },

  avalanche: async (options: WalletOptions) => {
    const wallet = await getAvalancheWallet(new Avalanche('', 1), options);
    return {
      ethereumAddress: wallet?.ethereumAddress,
      cAddressBech: wallet?.getCAddressString(),
      pAddressBech: wallet?.getPAddressString(),
    };
  },
};
