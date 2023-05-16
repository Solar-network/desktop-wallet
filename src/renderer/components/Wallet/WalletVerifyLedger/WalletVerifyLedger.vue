<template>
  <div class="mx-4 overflow-hidden">
    <div class="flex flex-row pb-5 border-b border-dashed border-theme-line-separator">
      <div class="flex flex-col justify-center pl-4">
        <span class="font-bold">
          {{ $t('WALLET_ADDRESS_VERIFY.HEADER') }}
        </span>
        <span>{{ $t('WALLET_ADDRESS_VERIFY.DESCRIPTION') }}</span>
      </div>

      <div class="flex items-center ml-4">
        <ButtonModal
          :label="$t('WALLET_ADDRESS_VERIFY.BUTTON_VERIFY')"
          class="blue-button py-2 px-4"
        >
          <template slot-scope="{ toggle, isOpen }">
            <WalletVerifyLedgerModal
              v-if="isOpen"
              :wallet="currentWallet"
              @cancel="toggle"
            />
          </template>
        </ButtonModal>
      </div>
    </div>
  </div>
</template>

<script>
import { ButtonModal } from "@/components/Button";
import { WalletVerifyLedgerModal } from "@/components/Wallet";

export default {
    name: "WalletVerifyLedger",

    components: {
        ButtonModal,
        WalletVerifyLedgerModal
    },

    computed: {
        currentWallet () {
            return this.wallet_fromRoute;
        }
    }
};
</script>

<style>
.WalletVerifyLedger__message:hover {
  @apply bg-theme-table-row-hover
}
</style>
