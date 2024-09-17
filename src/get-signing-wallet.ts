import { Transaction as BinanceTransaction } from '@binance-chain/javascript-sdk';
import { fromBase64 } from '@cosmjs/encoding';
import { isOfflineDirectSigner } from '@cosmjs/proto-signing';
import { EXTRINSIC_VERSION } from '@polkadot/types/extrinsic/v4/Extrinsic';
import {
  Transaction as SolanaTransaction,
  StakeProgram,
} from '@solana/web3.js';
import {
  CosmosNetworks,
  EvmNetworks,
  Networks,
  SubstrateNetworks,
  cosmosChainConfig,
} from '@stakekit/common';
import {
  GetRegistryOpts,
  UnsignedTransaction,
  construct,
  createMetadata,
  getRegistry,
} from '@substrate/txwrapper-polkadot';
import { Cell, SendMode, loadMessageRelaxed } from '@ton/ton';
import { SignDoc, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { Transaction, signTransaction } from 'near-api-js/lib/transaction';
import { getAvalancheWallet } from './avalanche';
import { getBinanceChainWallet } from './binance';
import { getCeloWallet } from './celo';
import {
  LedgerApps,
  SigningWallet,
  WalletOptions,
  isLedgerOptions,
} from './constants';
import { getStargateWallet } from './cosmos';
import { getEthereumWallet } from './ethereum';
import { getNearWallet, nearKeyPairToAddress } from './near';
import {
  SolanaSigner,
  getSolanaStakeAccountDerivationPath,
  getSolanaWallet,
} from './solana';
import { getSubstrateWallet } from './substrate';
import { getTezosWallet } from './tezos';
import { getTonWallet } from './ton';
import { getTronWallet } from './tron';
import { incrementDerivationPath } from './utils';
import { EVMUnsignedTx, UnsignedTx } from '@avalabs/avalanchejs';

const avalancheCSigningWallet = async (
  options: WalletOptions,
): Promise<SigningWallet> => {
  const avalancheWallet = await getAvalancheWallet(options);
  const wallet = await getEthereumWallet(options);
  if (avalancheWallet === null) {
    throw new Error('Wallet not initialised');
  }
  return {
    signTransaction: (tx) => wallet.signTransaction(JSON.parse(tx)),
    getAddress: () => wallet.getAddress(),
    getAdditionalAddresses: async () => ({
      cAddressBech: avalancheWallet.getCAddressString(),
      pAddressBech: avalancheWallet.getPAddressString(),
    }),
  };
};

const avalanchePSigningWallet = async (
  options: WalletOptions,
): Promise<SigningWallet> => {
  const wallet = await getAvalancheWallet(options);
  if (wallet === null) {
    throw new Error('Wallet not initialised');
  }

  return {
    signTransaction: async (str) => {
      const unsignedTx = UnsignedTx.fromJSON(str);
      return await wallet.signP(unsignedTx);
    },
    getAddress: async () => wallet.ethereumAddress,
    getAdditionalAddresses: async () => ({
      cAddressBech: wallet.getCAddressString(),
      pAddressBech: wallet.getPAddressString(),
    }),
  };
};

const avalancheCAtomicSigningWallet = async (
  options: WalletOptions,
): Promise<SigningWallet> => {
  const wallet = await getAvalancheWallet(options);
  if (wallet === null) {
    throw new Error('Wallet not initialised');
  }
  return {
    signTransaction: async (str) => {
      const unsignedTx = EVMUnsignedTx.fromJSON(str);
      return await wallet.signC(unsignedTx);
    },
    getAddress: async () => wallet.ethereumAddress,
    getAdditionalAddresses: async () => ({
      cAddressBech: wallet.getCAddressString(),
      pAddressBech: wallet.getPAddressString(),
    }),
  };
};

const evmSigningWallet = async (
  options: WalletOptions,
): Promise<SigningWallet> => {
  const wallet = await getEthereumWallet(options);
  return {
    signTransaction: (tx) => wallet.signTransaction(JSON.parse(tx)),
    signMessage: (tx) => wallet.signMessage(tx),
    getAddress: () => wallet.getAddress(),
    getAdditionalAddresses: async () => ({}),
  };
};

const bscSigningWallet = async (
  options: WalletOptions,
): Promise<SigningWallet> => {
  const wallet = await getEthereumWallet(options);
  const beaconWallet = await getBinanceChainWallet(options);

  return {
    signTransaction: (tx) => wallet.signTransaction(JSON.parse(tx)),
    getAddress: () => wallet.getAddress(),
    getAdditionalAddresses: async () => ({
      binanceBeaconAddress: beaconWallet.address,
    }),
  };
};

const celoSigningWallet = async (
  options: WalletOptions,
): Promise<SigningWallet> => {
  const wallet = await getCeloWallet(options);

  return {
    signTransaction: (tx) => wallet.signTransaction(JSON.parse(tx)),
    getAddress: () => wallet.getAddress(),
    getAdditionalAddresses: async () => ({}),
  };
};

const tronSigningWallet = async (
  options: WalletOptions,
): Promise<SigningWallet> => {
  const wallet = await getTronWallet(options);
  const address =
    wallet.defaultAddress.base58 !== false ? wallet.defaultAddress.base58 : '';

  return {
    signTransaction: async (tx) => {
      const signedTx = await wallet.trx.sign(JSON.parse(tx));
      return JSON.stringify(signedTx);
    },
    getAddress: async () => address,
    getAdditionalAddresses: async () => ({}),
  };
};

const substrateSigningWallet = async (
  options: WalletOptions,
  network: SubstrateNetworks,
): Promise<SigningWallet> => {
  const wallet = await getSubstrateWallet(options, network);

  return {
    signTransaction: async (tx) => {
      const {
        tx: unsignedTx,
        specName,
        specVersion,
        metadataRpc,
      } = JSON.parse(tx) as {
        tx: UnsignedTransaction;
        specName: GetRegistryOpts['specName'];
        specVersion: number;
        metadataRpc: `0x${string}`;
      };

      const registry = getRegistry({
        chainName: specName,
        specName,
        specVersion,
        metadataRpc,
      });

      const signingPayload = construct.signingPayload(unsignedTx, {
        registry,
      });
      registry.setMetadata(createMetadata(registry, metadataRpc));

      const { signature } = registry
        .createType('ExtrinsicPayload', signingPayload, {
          version: EXTRINSIC_VERSION,
        })
        .sign(wallet);

      return construct.signedTx(unsignedTx, signature, {
        metadataRpc,
        registry,
      });
    },
    getAddress: async () => wallet.address,
    getAdditionalAddresses: async () => ({}),
  };
};

const cosmosSigningWallet = async (
  prefix: string,
  options: WalletOptions,
  network: CosmosNetworks,
): Promise<SigningWallet> => {
  const wallet = await getStargateWallet(prefix, options, network);
  const [{ address, pubkey }] = await wallet.getAccounts();

  return {
    signTransaction: async (str) => {
      if (isOfflineDirectSigner(wallet)) {
        const doc = SignDoc.decode(Buffer.from(str, 'hex'));

        const result = await wallet.signDirect(address, doc);
        return Buffer.from(
          TxRaw.encode(
            TxRaw.fromPartial({
              authInfoBytes: doc.authInfoBytes,
              bodyBytes: doc.bodyBytes,
              signatures: [fromBase64(result.signature.signature)],
            }),
          ).finish(),
        ).toString('hex');
      }
      throw new Error('Only direct signing supported');
    },
    getAddress: async () => address,
    getAdditionalAddresses: async () => ({
      cosmosPubKey: Buffer.from(pubkey).toString('base64'),
    }),
  };
};

const nearSigningWallet = async (
  options: WalletOptions,
): Promise<SigningWallet> => {
  const wallet = await getNearWallet(options);

  const address = await nearKeyPairToAddress(wallet);
  return {
    signTransaction: async (doc) => {
      const tx = Transaction.decode(Buffer.from(doc, 'hex'));
      const [, signed] = await signTransaction(tx, wallet);
      return Buffer.from(signed.encode()).toString('hex');
    },
    getAddress: async () => address,
    getAdditionalAddresses: async () => ({}),
  };
};

const tezosSigningWallet = async (
  options: WalletOptions,
): Promise<SigningWallet> => {
  const wallet = await getTezosWallet(options);

  return {
    signTransaction: async (raw) => {
      const response = await wallet.sign(raw, new Uint8Array([3]));
      return JSON.stringify(response);
    },
    getAddress: () => wallet.publicKeyHash(),
    getAdditionalAddresses: async () => ({
      tezosPubKey: await wallet.publicKey(),
    }),
  };
};

const binanceSigningWallet = async (
  options: WalletOptions,
): Promise<SigningWallet> => {
  const wallet = await getBinanceChainWallet(options);

  return {
    signTransaction: async (raw: string) => {
      const privateKey = (wallet as any).privateKey;

      if (privateKey !== undefined) {
        const { signMsg, txRaw } = JSON.parse(raw);

        for (const [key, value] of Object.entries(txRaw.msg)) {
          if ((value as any).type === 'Buffer') {
            txRaw.msg[key] = Buffer.from((value as any).data);
          }
        }

        const tx = new BinanceTransaction(txRaw);

        const signed = tx.sign(privateKey, signMsg);

        return signed.serialize();
      }
      throw new Error('Testing private key');
    },
    getAddress: async () => wallet.address,
    getAdditionalAddresses: async () => ({}),
  };
};

const solanaSigningWallet = async (
  options: WalletOptions,
): Promise<SigningWallet> => {
  const wallet = await getSolanaWallet(options);

  const getSolanaIndexedWallet = (index: number) =>
    getSolanaWallet(
      isLedgerOptions(options)
        ? {
            ...options,
            config: {
              [LedgerApps.Solana]: {
                derivationPath: incrementDerivationPath(
                  `${options.config.Solana!.derivationPath}/0`,
                  index,
                ),
              },
            },
          }
        : {
            ...options,
            derivationPathOverride: getSolanaStakeAccountDerivationPath(
              options,
              index,
            ),
          },
    );

  const getPublicKeyAddress = async (account: SolanaSigner) => {
    return (await account.getPublicKey()).toBase58();
  };

  const getAdditionalAddresses = async () => {
    const { stakeAccounts, lidoStakeAccounts } = await getAdditionalAccounts();

    // NOTE: we are keeping the keys for compatibility
    return {
      stakeAccounts: await Promise.all(stakeAccounts.map(getPublicKeyAddress)),
      lidoStakeAccounts: await Promise.all(
        lidoStakeAccounts.map(getPublicKeyAddress),
      ),
    };
  };

  const getAdditionalAccounts = async () => {
    const [stakeAccounts, lidoStakeAccounts] = await Promise.all([
      Promise.all([1, 2, 3, 4, 5].map(getSolanaIndexedWallet)),
      Promise.all([6, 7, 8, 9, 10].map(getSolanaIndexedWallet)),
    ]);
    return {
      stakeAccounts,
      lidoStakeAccounts,
    };
  };

  const signStakeProgramTransaction = async (tx: SolanaTransaction) => {
    const signatures = tx.signatures.map((signature) =>
      signature.publicKey.toBase58(),
    );
    const additionalAddresses = await getAdditionalAccounts();

    const signedTransaction = await [
      ...additionalAddresses.stakeAccounts,
      ...additionalAddresses.lidoStakeAccounts,
    ].reduce(async (prevPromise, account) => {
      const signed = await prevPromise;
      const accountAddress = (await account.getPublicKey()).toBase58();

      if (signatures.indexOf(accountAddress) !== -1) {
        return await account.signTransaction(signed);
      }

      return signed;
    }, Promise.resolve(tx));

    return signedTransaction.serialize().toString('hex');
  };

  return {
    signTransaction: async (str: string) => {
      const tx = SolanaTransaction.from(Buffer.from(str, 'hex'));
      const signed = await wallet.signTransaction(tx);

      const compiledMessage = tx.compileMessage();
      const isStakeProgram = compiledMessage.instructions.some(
        (instruction) => {
          return (
            compiledMessage.accountKeys[
              instruction.programIdIndex
            ].toBase58() === StakeProgram.programId.toBase58()
          );
        },
      );

      if (isStakeProgram) {
        return await signStakeProgramTransaction(signed);
      }

      return signed.serialize().toString('hex');
    },
    getAddress: () => wallet.getPublicKey().then((x) => x.toBase58()),
    getAdditionalAddresses,
  };
};

const tonSigningWallet = async (
  options: WalletOptions,
): Promise<SigningWallet> => {
  const { wallet, key } = await getTonWallet(options);

  return {
    signTransaction: async (raw) => {
      const parsed = JSON.parse(raw) as {
        message: string;
        seqno: number;
      };

      const deserialized: Cell = Cell.fromBoc(
        Buffer.from(parsed.message, 'base64'),
      )[0];
      const loadedMessage = loadMessageRelaxed(deserialized.asSlice());

      const transfer = wallet.createTransfer({
        messages: [loadedMessage],
        secretKey: key.secretKey,
        seqno: parsed.seqno,
        sendMode: SendMode.PAY_GAS_SEPARATELY,
      });

      return transfer.toBoc().toString('base64');
    },
    getAddress: async () => wallet.address.toString({ bounceable: false }),
    getAdditionalAddresses: async () => ({}),
  };
};

const getters: {
  [n in Networks]?: (o: WalletOptions) => Promise<SigningWallet>;
} = {
  ...Object.values(EvmNetworks).reduce(
    (accum, n) => ({ ...accum, [n]: evmSigningWallet }),
    {},
  ),
  [EvmNetworks.Celo]: celoSigningWallet,
  ...Object.values(CosmosNetworks).reduce(
    (accum, n) => ({
      ...accum,
      [n]: (o: WalletOptions) => {
        return cosmosSigningWallet(cosmosChainConfig[n].bech32Prefix, o, n);
      },
    }),
    {},
  ),
  [Networks.Near]: nearSigningWallet,
  [Networks.Tezos]: tezosSigningWallet,
  [Networks.Solana]: solanaSigningWallet,
  [Networks.BinanceBeacon]: binanceSigningWallet,
  // [Networks.BinanceBeaconGanges]: binanceSigningWallet,
  [Networks.Binance]: bscSigningWallet,
  [Networks.AvalancheC]: avalancheCSigningWallet,
  [Networks.AvalancheCAtomic]: avalancheCAtomicSigningWallet,
  [Networks.AvalancheP]: avalanchePSigningWallet,
  [Networks.Tron]: tronSigningWallet,
  ...Object.values(SubstrateNetworks).reduce(
    (accum, n) => ({
      ...accum,
      [n]: (o: WalletOptions) => {
        return substrateSigningWallet(o, n);
      },
    }),
    {},
  ),
  [Networks.Ton]: tonSigningWallet,
};

export const getSigningWallet = async (
  network: Networks,
  options: WalletOptions,
) => {
  const getSigningWalletImpl = getters[network];
  if (!getSigningWalletImpl) {
    throw new Error('Missing wallet implementation for network');
  }

  return await getSigningWalletImpl(options);
};
