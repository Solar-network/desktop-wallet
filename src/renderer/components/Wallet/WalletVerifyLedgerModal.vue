<template>
  <ModalWindow
    :title="$t('WALLET_ADDRESS_VERIFY.DESCRIPTION')"
    :allow-close="!showLedgerLoader"
    @close="emitCancel"
  >
    <div
      class="w-80 flex flex-col w-full justify-center items-center"
    >
      {{ $t('WALLET_ADDRESS_VERIFY.REVIEW') }}
      <br><br><br>
      {{ $t('WALLET_ADDRESS_VERIFY.MATCH') }}
      <br><br>
      <b>{{ $t(wallet.address) }}</b>
      <br>
      <div
        class="flex flex-col w-full justify-center items-center"
      >
        <div
          class="flex flex-col w-full justify-center content-center"
        >
          <br>
          <div
            v-if="showLedgerLoader"
          >
            <br>
            <Loader />
          </div>

          <div
            v-if="!showLedgerLoader"
            class="flex flex-col w-full mt-8 justify-center items-center"
          >
            <img
              v-if="showSuccess"
              :src="assets_loadImage('pages/ledger-verify/success.svg')"
              class="md:w-2/5"
            >
            <img
              v-else-if="showFailed"
              :src="assets_loadImage('pages/ledger-verify/fail.svg')"
              class="md:w-2/5"
            >
          </div>

          <br>

          <div
            v-if="showLedgerLoader"
            class="flex flex-col justify-center"
          >
            <br>
            {{ $t('WALLET_ADDRESS_VERIFY.CONFIRM_FOOTER_MESSAGE') }}
          </div>

          <div
            class="flex flex-col justify-center items-center text-center"
          >
            <div
              v-if="showSuccess"
            >
              <br><br>
              {{ $t('WALLET_ADDRESS_VERIFY.CONFIRM_FOOTER_SUCCESS') }}
            </div>
            <div
              v-if="showFailed"
            >
              <br><br>
              {{ $t('WALLET_ADDRESS_VERIFY.CONFIRM_FOOTER_FAILED') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </ModalWindow>
</template>

<script>
import Loader from "@/components/utils/Loader";
import { ModalWindow } from "@/components/Modal";
import TransactionService from "@/services/transaction";

export default {
    name: "WalletVerifyLedgerModal",

    components: {
        Loader,
        ModalWindow
    },

    props: {
        wallet: {
            type: Object,
            required: true
        }
    },

    data: () => ({
        showLedgerLoader: true,
        showSuccess: false,
        showFailed: false
    }),

    mounted () {
        this.verifyAddress();
    },

    methods: {
        async verifyAddress () {
            try {
                const ledgerAddress = await TransactionService.ledgerGetAddressApproval(this.wallet, this);

                this.showLedgerLoader = false;

                if (ledgerAddress === this.wallet.address) {
                    this.showSuccess = true;
                } else {
                    this.showFailed = true;
                }
            } catch (error) {
                this.$logger.error(error);
            }
        },

        emitCancel () {
            this.$emit("cancel");
        }
    }
};
</script>
