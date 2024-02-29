import {
  LEDGER_EXCHANGE_TIMEOUT,
  LedgerWallet,
  getAppEth,
  getLedgerProvider,
} from '@avalabs/avalanche-wallet-sdk';
import Transport from '@ledgerhq/hw-transport';
import HDKey from 'hdkey';
import * as bip32 from 'bip32';

// m / purpose' / coin_type' / account' / change / index
function parseDerivationPath(path: string) {
  const [m, purpose, coinType, account, ...rest] = path.split('/');

  return {
    prefix: [m, purpose, coinType, account].join('/'),
    suffix: rest.join('/'),
  };
}

export function getEthAddressKeyFromAccountKey(xpub: string, path: string) {
  const node = bip32.fromBase58(xpub).derivePath(path);
  return node.toBase58();
}

export class StakeKitAvalancheWallet extends LedgerWallet {
  static async getStakeKitExtendedPublicKeyEthAccount(
    transport: Transport,
    derivationPath: string,
  ): Promise<string> {
    const ethApp = getAppEth(transport);
    const ethRes = await ethApp.getAddress(
      parseDerivationPath(derivationPath).prefix,
      false,
      true,
    );
    const hdEth = new HDKey();

    hdEth.publicKey = Buffer.from(ethRes.publicKey, 'hex');
    hdEth.chainCode = Buffer.from(ethRes.chainCode!, 'hex');
    return hdEth.publicExtendedKey;
  }

  static async getStakeKitExtendedPublicKeyEthAddress(
    transport: Transport,
    derivationPath: string,
  ): Promise<string> {
    const accountKey =
      await StakeKitAvalancheWallet.getStakeKitExtendedPublicKeyEthAccount(
        transport,
        derivationPath,
      );
    return getEthAddressKeyFromAccountKey(
      accountKey,
      parseDerivationPath(derivationPath).suffix,
    );
  }

  static async getStakeKitExtendedPublicKeyAvaxAccount(
    transport: Transport,
    derivationPath: string,
  ): Promise<string> {
    const prov = await getLedgerProvider(transport);
    const res = await prov.getXPUB(transport, derivationPath);

    const pubKey = res.pubKey;
    const chainCode = res.chainCode;

    // Get the base58 publick key from the HDKey instance
    const hdKey = new HDKey();
    hdKey.publicKey = pubKey;
    hdKey.chainCode = chainCode;

    return hdKey.publicExtendedKey;
  }

  static async fromStakeKitTransport(
    transport: Transport,
    AvaxDerivationPath: string,
    EthDerivationPath: string,
  ) {
    transport.setExchangeTimeout(LEDGER_EXCHANGE_TIMEOUT);

    const pubAvax =
      await StakeKitAvalancheWallet.getStakeKitExtendedPublicKeyAvaxAccount(
        transport,
        AvaxDerivationPath,
      );
    const pubEth =
      await StakeKitAvalancheWallet.getStakeKitExtendedPublicKeyEthAddress(
        transport,
        EthDerivationPath,
      );

    // Use this transport for all ledger instances
    await LedgerWallet.setTransport(transport);
    const wallet = new StakeKitAvalancheWallet(pubAvax, pubEth, 0);
    return wallet;
  }
}
