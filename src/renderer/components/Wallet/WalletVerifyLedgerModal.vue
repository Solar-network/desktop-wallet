<template>
  <ModalWindow
    :title="$t('WALLET_ADDRESS_VERIFY.DESCRIPTION')"
    :allow-close="!showLedgerLoader"
    @close="emitCancel"
  >
    <div
      class="w-85 h-80 flex flex-col justify-center items-center space-y-4"
    >
      {{ $t('WALLET_ADDRESS_VERIFY.REVIEW') }}
      <br><br><br>
      {{ $t('WALLET_ADDRESS_VERIFY.MATCH') }}
      <b>{{ $t(wallet.address) }}</b>
      <div
        class="flex flex-col w-full justify-center items-center space-y-4"
      >
        <div
          class="flex flex-col w-full mt-5 items-center justify-center content-center space-y-4"
        >
          <Loader
            v-if="showLedgerLoader"
          />
          <img
            v-if="!showLedgerLoader"
            :src="statusImage"
            class="md:w-3/5"
          >
          <div
            v-if="showLedgerLoader"
            class="flex flex-col justify-center space-y-4"
          >
            <br>
            {{ $t('WALLET_ADDRESS_VERIFY.CONFIRM_FOOTER_MESSAGE') }}
          </div>
        </div>
        <div
          class="flex flex-col justify-center items-center text-center"
        >
          <div
            v-if="showSuccess"
          >
            {{ $t('WALLET_ADDRESS_VERIFY.CONFIRM_FOOTER_SUCCESS') }}
          </div>
          <div
            v-if="showFailed"
          >
            {{ $t('WALLET_ADDRESS_VERIFY.CONFIRM_FOOTER_FAILED') }}
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

    computed: {
        statusImage () {
            return this.getStatusImage();
        }
    },

    mounted () {
        this.verifyAddress();
    },

    methods: {
        getStatusImage () {
            switch (true) {
            case this.showSuccess:
                return this.assets_loadImage("pages/ledger-verify/success.svg");
            case this.showFailed:
                return this.assets_loadImage("pages/ledger-verify/fail.svg");
            default:
                return "";
            }
        },

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

<style scoped>
.space-y-4 {
    gap: 1rem;
}
</style>
