<template>
  <main class="WalletDetails flex flex-col">
    <WalletHeading />

    <MenuTab
      ref="menutab"
      v-model="currentTab"
      :class="{ 'rounded-b-lg lg:rounded-br-none' : !isBlockProducersTab || !isOwned }"
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
          @on-block-producer-percentage-change="changeVotePercentage"
        />
      </MenuTabItem>
    </MenuTab>
    <div
      v-if="isBlockProducersTab && isOwned"
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
          :placeholder="$t('WALLET_BLOCK_PRODUCERS.SEARCH_BLOCK_PRODUCER')"
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
            {{ $t('WALLET_BLOCK_PRODUCERS.LOADING_VOTE') }}
          </span>
        </div>
        <div
          v-else-if="isAwaitingConfirmation"
          class="flex"
        >
          <span class="font-semibold">
            {{ $t('WALLET_BLOCK_PRODUCERS.AWAITING_VOTE_CONFIRMATION') }}
          </span>
        </div>
        <div
          v-else-if="true"
          class="flex"
        >
          <i18n
            tag="span"
            class="font-semibold pr-3 border-r border-theme-line-separator"
            :class="[0, 10000].includes(totalRemaining) ? 'success' : (totalRemaining < 0 ? 'error' : 'warn')"
            path="WALLET_BLOCK_PRODUCERS.VOTED_FOR"
          >
            <strong place="blockProducer">{{ (totalVotes / 100).toFixed(2) }}</strong>
          </i18n>
          <i18n
            tag="span"
            class="font-semibold px-3 border-r border-theme-line-separator"
            :class="[0, 10000].includes(totalRemaining) ? 'success' : (totalRemaining < 0 ? 'error' : 'warn')"
            path="WALLET_BLOCK_PRODUCERS.TOTAL_REMAINING"
          >
            <strong place="percentage">{{ (totalRemaining / 100).toFixed(2) }}</strong>
          </i18n>
          <i18n
            tag="span"
            class="font-semibold px-3"
            :class="totalNewVotes <= activeBlockProducers ? 'success' : 'error'"
            path="WALLET_BLOCK_PRODUCERS.NUMBER_OF_BLOCK_PRODUCERS_VOTED"
          >
            <strong place="n">{{ totalNewVotes }}/{{ activeBlockProducers }}</strong>
          </i18n>
        </div>
      </div>
      <button
        v-if="!isAwaitingConfirmation && !isLoadingVote"
        :disabled="!areVotesUpdated || !(totalRemaining === 0 || totalRemaining === 10000) || totalNewVotes > activeBlockProducers"
        class="WalletDetails__button blue-button vote-button"
        type="button"
        @click="openVote"
      >
        {{ $t( totalNewVotes > 0 || totalOldVotes === 0 ? 'WALLET_BLOCK_PRODUCERS.VOTE' : 'WALLET_BLOCK_PRODUCERS.CANCEL_VOTE') }}
      </button>

      <!-- Vote/unvote modal -->
      <TransactionModal
        v-if="isVoting"
        :title="getVoteTitle()"
        :type="3"
        :voted-block-producers="newVotes"
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
    WalletBlockProducers,
    WalletHeading,
    WalletIpfs,
    WalletMultiSignature,
    WalletSelectBlockProducer,
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
        WalletBlockProducers,
        WalletHeading,
        WalletIpfs,
        WalletMultiSignature,
        WalletSelectBlockProducer,
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
            blockProducerSearch: () => this.search
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
        activeBlockProducers () {
            return this.session_network.constants.activeDelegates || 53;
        },

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
                    component: "WalletBlockProducers",
                    componentName: "WalletBlockProducers",
                    text: this.$t("PAGES.WALLET.BLOCK_PRODUCERS")
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

        isBlockProducersTab () {
            return this.currentTab === "WalletBlockProducers";
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

        totalNewVotes () {
            return Object.keys(this.newVotes).length;
        },

        totalOldVotes () {
            return Object.keys(this.walletVotes).length;
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
            case "WalletBlockProducers":
                this.$synchronizer.focus("wallets", "contacts", "blockProducers");
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
        changeVotePercentage (value, blockProducer) {
            this.$delete(this.newVotes, blockProducer);
            if (value !== 0) {
                this.$set(this.newVotes, blockProducer, value);
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
                return this.$t("WALLET_BLOCK_PRODUCERS.CANCEL_VOTE");
            } else {
                return this.$t("WALLET_BLOCK_PRODUCERS.VOTE");
            }
        },

        async fetchWalletVotes () {
            if (!this.currentWallet) {
                return;
            }

            let currentBlockProducers = Object.keys(this.walletVotes);
            try {
                this.isLoadingVote = true;
                const walletVotes = await this.$client.fetchWalletVote(this.currentWallet.address);
                if (walletVotes) {
                    for (const blockProducer in walletVotes) {
                        const blockProducerInfo = this.$store.getters["blockProducer/byUsername"](blockProducer);
                        const percentage = Math.round(walletVotes[blockProducer].percent * 100);
                        if (percentage !== this.walletVotes[blockProducer]) {
                            this.$delete(this.walletVotes, blockProducer);
                            this.$delete(this.newVotes, blockProducer);
                            this.$set(this.walletVotes, blockProducer, percentage);
                            if (blockProducerInfo.rank !== undefined) this.$set(this.newVotes, blockProducer, percentage);
                        }
                        currentBlockProducers = currentBlockProducers.filter(curr => curr !== blockProducer);
                    }
                    for (const blockProducer of currentBlockProducers) {
                        this.$delete(this.walletVotes, blockProducer);
                    }
                } else {
                    for (const blockProducer in this.walletVotes) {
                        this.$delete(this.walletVotes, blockProducer);
                    }
                }
            } catch (error) {
                for (const blockProducer in this.walletVotes) {
                    this.$delete(this.walletVotes, blockProducer);
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

            // To navigate to the transaction tab instead of the block producer tab when the
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
