<template>
  <main class="WalletDetails flex flex-col">
    <WalletHeading />

    <MenuTab
      ref="menutab"
      v-model="currentTab"
      :class="{ 'rounded-b-lg lg:rounded-br-none' : !isDelegatesTab || !isOwned }"
      class="flex-1 overflow-y-auto"
    >
      <MenuTabItem
        key="BackItem"
        :label="$t('COMMON.BACK')"
        :on-click="historyBack"
      >
        <div
          slot="header"
          class="WalletDetails__back-button flex items-center"
        >
          <SvgIcon
            name="send"
            view-box="0 0 8 8"
          />
          <span
            class="text-bold ml-2 text-base"
          >
            {{ $t('COMMON.BACK') }}
          </span>
        </div>
      </MenuTabItem>
      <MenuTabItem
        v-for="tab in tabs"
        :key="tab.componentName"
        :label="tab.text"
        :tab="tab.componentName"
      >
        <Component
          :is="tab.component"
          slot-scope="{ isActive }"
          :is-active="isActive"
          @on-delegate-percentage-change="changeVotePercentage"
        />
      </MenuTabItem>
    </MenuTab>
    <div
      v-if="isDelegatesTab && isOwned"
      class="bg-theme-feature px-5 flex flex-row rounded-b-lg lg:rounded-br-none"
    >
      <span
        class="WalletDetails__button rounded-l search-input-container"
        @click="$refs.search.focus()"
      >
        <SvgIcon
          name="search"
          view-box="0 0 17 16"
          class="mr-2"
        />
        <input
          ref="search"
          v-model="search"
          class="WalletDetails__button rounded-l"
          :placeholder="$t('WALLET_DELEGATES.SEARCH_DELEGATE')"
        >
      </span>
      <div
        class="mt-4 mb-4 py-4 px-6 text-theme-voting-banner-text bg-theme-voting-banner-background w-full flex"
        :class="{ 'rounded-r': isOwned }"
      >
        <div
          v-if="!isAwaitingConfirmation && isLoadingVote"
          class="flex"
        >
          <span class="font-semibold">
            {{ $t('WALLET_DELEGATES.LOADING_VOTE') }}
          </span>
        </div>
        <div
          v-else-if="isAwaitingConfirmation"
          class="flex"
        >
          <span class="font-semibold">
            {{ $t('WALLET_DELEGATES.AWAITING_VOTE_CONFIRMATION') }}
          </span>
        </div>
        <div
          v-else-if="true"
          class="flex"
        >
          <i18n
            tag="span"
            class="font-semibold pr-6 border-r border-theme-line-separator"
            :class="[0, 10000].includes(totalRemaining) ? 'success' : (totalRemaining < 0 ? 'error' : 'warn')"
            path="WALLET_DELEGATES.VOTED_FOR"
          >
            <strong place="delegate">
              {{ formatPercentage(totalVotes) }}
            </strong>
          </i18n>
          <i18n
            tag="span"
            class="font-semibold px-6"
            :class="[0, 10000].includes(totalRemaining) ? 'success' : (totalRemaining < 0 ? 'error' : 'warn')"
            path="WALLET_DELEGATES.TOTAL_REMAINING"
          >
            <strong place="percentage">
              {{ formatPercentage(totalRemaining) }}
            </strong>
          </i18n>
        </div>
      </div>
      <button
        v-if="!isAwaitingConfirmation && !isLoadingVote"
        :disabled="!areVotesUpdated || !(totalRemaining === 0 || totalRemaining === 10000)"
        class="WalletDetails__button blue-button vote-button"
        type="button"
        @click="openVote"
      >
        {{ $t( Object.keys(newVotes).length > 0 || Object.keys(walletVotes).length === 0 ? 'WALLET_DELEGATES.VOTE' : 'WALLET_DELEGATES.UNVOTE') }}
      </button>

      <!-- Vote/unvote modal -->
      <TransactionModal
        v-if="isVoting"
        :title="getVoteTitle()"
        :type="3"
        :voted-delegates="newVotes"
        @cancel="onCancel"
        @close="onCancel"
        @sent="onSent"
      />
    </div>
  </main>
</template>

<script>
import { remote } from "electron";
import { at } from "lodash";
/* eslint-disable vue/no-unused-components */
import { ButtonGeneric } from "@/components/Button";
import { TransactionModal } from "@/components/Transaction";
import {
    WalletDelegates,
    WalletHeading,
    WalletIpfs,
    WalletMultiSignature,
    WalletSelectDelegate,
    WalletSignVerify,
    WalletStatistics,
    WalletTransactions
} from "../";
import { MenuTab, MenuTabItem } from "@/components/Menu";
import SvgIcon from "@/components/SvgIcon";

export default {
    components: {
        ButtonGeneric,
        MenuTab,
        MenuTabItem,
        TransactionModal,
        WalletDelegates,
        WalletHeading,
        WalletIpfs,
        WalletMultiSignature,
        WalletSelectDelegate,
        WalletSignVerify,
        WalletStatistics,
        WalletTransactions,
        SvgIcon
    },

    provide () {
        return {
            switchToTab: this.switchToTab,
            walletVotes: () => this.walletVotes,
            newVotes: () => this.newVotes,
            delegateSearch: () => this.search
        };
    },

    data () {
        return {
            currentTab: "",
            walletVotes: {},
            newVotes: {},
            isVoting: false,
            isLoadingVote: true,
            search: ""
        };
    },

    computed: {
        pluginTabs () {
            return this.$store.getters["plugin/walletTabs"];
        },

        tabs () {
            const tabs = [
                {
                    component: "WalletTransactions",
                    componentName: "WalletTransactions",
                    text: this.$t("PAGES.WALLET.TRANSACTIONS")
                }
            ];

            if (this.currentWallet && this.isOwned) {
                tabs.push({
                    component: "WalletDelegates",
                    componentName: "WalletDelegates",
                    text: this.$t("PAGES.WALLET.DELEGATES")
                });

                tabs.push({
                    component: "WalletSignVerify",
                    componentName: "WalletSignVerify",
                    text: this.$t("PAGES.WALLET.SIGN_VERIFY")
                });
            }

            tabs.push({
                component: "WalletIpfs",
                componentName: "WalletIpfs",
                text: this.$t("PAGES.WALLET.IPFS")
            });

            if (this.isOwned) {
                tabs.push({
                    component: "WalletMultiSignature",
                    componentName: "WalletMultiSignature",
                    text: this.$t("PAGES.WALLET.MULTI_SIGNATURE")
                });
            }

            // TODO enable when there is something to show
            // if (this.session_network.market && this.session_network.market.enabled) {
            //   tabs.push({
            //     component: 'WalletStatistics',
            //     text: this.$t('PAGES.WALLET.STATISTICS')
            //   })
            // }

            if (this.pluginTabs) {
                this.pluginTabs.forEach(pluginTab => {
                    tabs.push({
                        component: pluginTab.component,
                        componentName: pluginTab.componentName,
                        text: pluginTab.tabTitle
                    });
                });
            }

            return tabs;
        },

        currentNetwork () {
            return this.session_network;
        },

        currentWallet () {
            return this.wallet_fromRoute;
        },

        isDelegatesTab () {
            return this.currentTab === "WalletDelegates";
        },

        isOwned () {
            return [
                ...this.$store.getters["wallet/byProfileId"](this.session_profile.id),
                ...this.$store.getters["ledger/wallets"]
            ].some(wallet => wallet.address === this.currentWallet.address);
        },

        unconfirmedVote () {
            return this.unconfirmedVotes.find(vote => {
                return vote.address === this.currentWallet.address;
            });
        },

        totalVotes () {
            const total = Object.keys(this.newVotes).reduce((a, o) => a + this.newVotes[o], 0);
            return total;
        },

        totalRemaining () {
            return 10000 - this.totalVotes;
        },

        areVotesUpdated () {
            const currentLength = Object.keys(this.walletVotes).length;
            const newLength = Object.keys(this.newVotes).length;

            if (currentLength === newLength) {
                return ![...Object.keys(this.walletVotes), ...Object.keys(this.newVotes)].every(
                    key => key in this.newVotes && key in this.walletVotes &&
                        this.walletVotes[key] === this.newVotes[key]);
            }
            return true;
        },

        unconfirmedVotes: {
            get () {
                return this.$store.getters["session/unconfirmedVotes"];
            },
            set (votes) {
                this.$store.dispatch("session/setUnconfirmedVotes", votes);

                this.$store.dispatch("profile/update", {
                    ...this.session_profile,
                    unconfirmedVotes: votes
                });
            }
        },

        isAwaitingConfirmation () {
            return !!this.unconfirmedVote;
        }
    },

    watch: {
        currentTab () {
            switch (this.currentTab) {
            case "WalletTransactions":
                this.$synchronizer.focus("wallets", "contacts");
                break;
            case "WalletDelegates":
                this.$synchronizer.focus("wallets", "contacts", "delegates");
                break;
            case "WalletSignVerify":
                // TODO
                break;
            }
        },
        async currentWallet (newValue, prevValue) {
            if (!newValue || !prevValue || newValue.address !== prevValue.address) {
                this.currentTab = "WalletTransactions";
                for (const wallet in this.walletVotes) {
                    this.$delete(this.walletVotes, wallet);
                }
                for (const wallet in this.newVotes) {
                    this.$delete(this.newVotes, wallet);
                }
            }
            await this.fetchWalletVotes();
        },
        tabs () {
            this.$nextTick(() => {
                this.$refs.menutab.collectItems();
            });
        },
        async isAwaitingConfirmation (newValue, oldValue) {
            if (!newValue && oldValue) {
                await this.fetchWalletVotes();
            }
        }
    },

    async created () {
        await this.$synchronizer.call("wallets");
        await this.fetchWalletVotes();
        this.$eventBus.on("wallet:reload", this.fetchWalletVotes);
    },

    beforeDestroy () {
        this.$eventBus.off("wallet:reload", this.fetchWalletVotes);
    },

    mounted () {
        this.currentTab = this.tabs[0].component;
    },

    methods: {
        changeVotePercentage (value, delegate) {
            this.$delete(this.newVotes, delegate);
            if (value !== 0) {
                this.$set(this.newVotes, delegate, value);
            }
        },
        historyBack () {
            const webContents = remote.getCurrentWindow().webContents;

            if (webContents.canGoBack()) {
                webContents.goBack();
            } else {
                try {
                    if (this.currentWallet.isContact) {
                        this.$router.push({ name: "contacts" });
                    } else {
                        this.$router.push({ name: "wallets" });
                    }
                } catch (error) {
                    throw new Error("It is not possible to go back in history");
                }
            }
        },

        switchToTab (component) {
            if (this.tabs.map(tab => tab.componentName).includes(component)) {
                this.currentTab = component;
            }
        },

        getVoteTitle () {
            if (Object.keys(this.newVotes).length === 0) {
                return this.$t("WALLET_DELEGATES.UNVOTE_DELEGATE");
            } else {
                return this.$t("WALLET_DELEGATES.VOTE");
            }
        },

        async fetchWalletVotes () {
            if (!this.currentWallet) {
                return;
            }

            let currentDelegates = Object.keys(this.walletVotes);
            try {
                this.isLoadingVote = true;
                const walletVotes = await this.$client.fetchWalletVote(this.currentWallet.address);
                if (walletVotes) {
                    for (const delegate in walletVotes) {
                        const delegateInfo = this.$store.getters["delegate/byUsername"](delegate);
                        const percentage = Math.round(walletVotes[delegate].percent * 100);
                        if (percentage !== this.walletVotes[delegate]) {
                            this.$delete(this.walletVotes, delegate);
                            this.$delete(this.newVotes, delegate);
                            this.$set(this.walletVotes, delegate, percentage);
                            if (delegateInfo.rank !== undefined) this.$set(this.newVotes, delegate, percentage);
                        }
                        currentDelegates = currentDelegates.filter(curr => curr !== delegate);
                    }
                    for (const delegate of currentDelegates) {
                        this.$delete(this.walletVotes, delegate);
                    }
                } else {
                    for (const delegate in this.walletVotes) {
                        this.$delete(this.walletVotes, delegate);
                    }
                }
            } catch (error) {
                for (const delegate in this.walletVotes) {
                    this.$delete(this.walletVotes, delegate);
                }

                const messages = at(error, "response.body.message");
                if (messages[0] !== "Wallet not found") {
                    this.$logger.error(error);
                    this.$error(this.$t("COMMON.FAILED_FETCH", {
                        name: "fetch vote",
                        msg: error.message
                    }));
                }
            } finally {
                this.isLoadingVote = false;
            }
        },

        openVote () {
            this.isVoting = true;
        },

        onCancel (reason) {
            this.isVoting = false;

            // To navigate to the transaction tab instead of the delegate tab when the
            // user clicks on a link of the transaction show modal
            if (reason && reason === "navigateToTransactions") {
                this.switchToTab("WalletTransactions");
            }
        },

        onSent (success, transaction) {
            if (success) {
                const votes = [
                    ...this.unconfirmedVotes,
                    {
                        id: transaction.id,
                        address: this.currentWallet.address,
                        publicKey: transaction.asset.votes[0],
                        timestamp: Date.now()
                    }
                ];

                this.unconfirmedVotes = votes;
            }

            this.isVoting = false;
        },

        formatPercentage (percentage) {
            let stringa = percentage.toString();
            const isNegative = stringa[0] === "-";
            if (isNegative) stringa = stringa.slice(1);
            let integer = stringa.slice(0, -2);
            if (integer === "") integer = "0";
            let decimal = stringa.slice(-2);
            if (decimal.length === 1) decimal = "0" + decimal;
            else if (decimal.length === 0) decimal = "00";
            return (isNegative ? "-" : "") + integer + "." + decimal;
        }
    }
};
</script>

<style lang="postcss">
.WalletDetails__button {
  transition: 0.5s;
  cursor: pointer;
  @apply .flex .items-center .text-theme-voting-banner-button-text .bg-theme-voting-banner-button .whitespace-no-wrap .mt-4 .mb-4 .p-4 .font-semibold .w-auto .text-center;
  padding: 0;
}
.WalletDetails__button:hover {
  transition: 0.5s;
  @apply .text-theme-voting-banner-button-text-hover .bg-theme-voting-banner-button-hover
}
.WalletDetails__back-button > svg {
  transform: rotate(-135deg)
}

.search-input-container {
  padding-left: 1rem;
}

.vote-button {
    padding: 1rem;
}

.error {
  color: var(--theme-error);
}

.success {
  color: var(--theme-success);
}

.warn {
  color: var(--theme-warn);
}
</style>
