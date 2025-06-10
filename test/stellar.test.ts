import { Networks } from '@stakekit/common';
import { getSigningWallet } from '../src';
import { ImportableWallets } from '../src/constants';

// Test mnemonic (do not use in production)
const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('Stellar Signing', () => {
  it('should create a Stellar signer for mainnet', async () => {
    const signingWallet = await getSigningWallet(Networks.Stellar, {
      mnemonic: TEST_MNEMONIC,
      walletType: ImportableWallets.Steakwallet, // Freighter uses Steakwallet derivation
      index: 0,
    });

    expect(signingWallet).toBeDefined();
    expect(typeof signingWallet.getAddress).toBe('function');
    expect(typeof signingWallet.signTransaction).toBe('function');
    expect(typeof signingWallet.getAdditionalAddresses).toBe('function');

    const address = await signingWallet.getAddress();
    expect(typeof address).toBe('string');
    expect(address.length).toBeGreaterThan(0);

    const additionalAddresses = await signingWallet.getAdditionalAddresses();
    expect(additionalAddresses).toEqual({});
  });

  it('should create a Stellar signer for testnet', async () => {
    const signingWallet = await getSigningWallet(Networks.StellarTestnet, {
      mnemonic: TEST_MNEMONIC,
      walletType: ImportableWallets.Steakwallet, // Freighter uses Steakwallet derivation
      index: 0,
    });

    expect(signingWallet).toBeDefined();

    const address = await signingWallet.getAddress();
    expect(typeof address).toBe('string');
    expect(address.length).toBeGreaterThan(0);
  });

  it('should throw error for Ledger wallet', async () => {
    await expect(
      getSigningWallet(Networks.Stellar, {
        config: {
          Stellar: {
            derivationPath: "m/44'/148'/0'/0'",
          },
        },
        transport: async () => ({}),
      } as any),
    ).rejects.toThrow('Stellar Ledger support not implemented');
  });

  it('should throw error for unsupported wallet type', async () => {
    await expect(
      getSigningWallet(Networks.Stellar, {
        mnemonic: TEST_MNEMONIC,
        walletType: 'UnsupportedWallet' as any,
        index: 0,
      }),
    ).rejects.toThrow('Stellar derivation path not supported for wallet type');
  });
});
