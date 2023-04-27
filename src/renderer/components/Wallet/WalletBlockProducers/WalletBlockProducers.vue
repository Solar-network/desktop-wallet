<template>
  <div class="WalletBlockProducers">
    <div
      v-if="!Object.keys(currentVotes).length && isExplanationDisplayed"
      class="WalletBlockProducers__explanation relative rounded-lg mt-2 mb-6 bg-theme-explanation-background text-theme-explanation-text flex flex-row items-center justify-between"
    >
      <div class="WalletBlockProducers__explanation__text flex text-left text-inherit py-4 pl-6">
        <span>
          {{ $t('WALLET_BLOCK_PRODUCERS.EXPLANATION', { blockProducers: activeBlockProducers }) }}
          <a
            :title="$t('WALLET_BLOCK_PRODUCERS.BLOG')"
            class="cursor-pointer inline"
            @click="electron_openExternal(votingUrl)"
          >
            {{ $t('WALLET_BLOCK_PRODUCERS.BLOG') }}
          </a>
        </span>
      </div>

      <div class="WalletBlockProducers__explanation__close flex py-4 px-6 z-10">
        <ButtonClose
          class="cursor-pointer select-none"
          @click="dismissExplanation"
        />
      </div>
    </div>

    <TableWrapper
      :columns="columns"
      :is-loading="isLoading"
      :is-remote="true"
      :rows="shownBlockProducers"
      :sort-query="{
        field: queryParams.sort.field,
        type: queryParams.sort.type
      }"
      :total-rows="totalCount"
      :no-data-message="$t('TABLE.NO_BLOCK_PRODUCERS')"
      class="WalletBlockProducers__table"
      @on-sort-change="onSortChange"
      @on-row-click="onRowClick"
    >
      <template
        slot-scope="data"
      >
        <div
          v-if="data.column.field === 'username'"
        >
          <div class="flex items-center">
            <div style="width: 250px">
              {{ data.formattedRow['username'] }}
            </div>
            <span
              v-if="Object.keys(currentVotes).includes(data.row.username)"
              class="vote-badge"
            >
              {{ `${$t('WALLET_BLOCK_PRODUCERS.VOTE')} ${formatPercentage(data.row.votePercent)}%` }}
            </span>
            <span
              v-if="offline(data.row.username)"
              class="error-badge"
            >
              {{ $t('WALLET_BLOCK_PRODUCERS.OFFLINE') }}
            </span>
            <span
              v-if="resigned(data.row.username)"
              class="error-badge"
            >
              {{ $t('WALLET_BLOCK_PRODUCERS.STATUS.RESIGNED') }}
            </span>
          </div>
        </div>

        <span
          v-else-if="data.column.field === 'newVotePercent'"
        >
          <InputPercentage
            :ref="'percentageInput-' + data.row.username"
            :value="data.row.newVotePercent"
            :helper-text="formatter_networkCurrency(data.row.voteBalance)"
            :is-offline="offline(data.row.username)"
            @percent-input="(value) => emitNewPercentage(value, data.formattedRow['username'])"
          />
        </span>

        <span v-else>
          {{ data.formattedRow[data.column.field] }}
        </span>
      </template>
    </TableWrapper>
  </div>
</template>

<script>
import { isEqual } from "lodash";
import { ButtonClose } from "@/components/Button";
import TableWrapper from "@/components/utils/TableWrapper";
import InputPercentage from "@/components/Input/InputPercentage.vue";

export default {
    name: "WalletBlockProducers",

    inject: ["walletVotes", "newVotes", "blockProducerSearch"],

    components: {
        ButtonClose,
        TableWrapper,
        InputPercentage
    },

    data () {
        return {
            currentPage: 1,
            blockProducers: [],
            shownBlockProducers: [],
            isExplanationTruncated: true,
            isLoading: false,
            totalCount: 0,
            queryParams: {
                sort: {
                    field: "rank",
                    type: "asc"
                }
            }
        };
    },

    computed: {
        currentVotes () {
            return this.walletVotes();
        },
        newVotesProp () {
            return this.newVotes();
        },
        filterSearch () {
            return this.blockProducerSearch();
        },

        activeBlockProducers () {
            return this.session_network.constants.activeDelegates || 53;
        },

        columns () {
            return [
                {
                    label: this.$t("WALLET_BLOCK_PRODUCERS.RANK"),
                    field: "rank",
                    type: "number",
                    thClass: "text-center",
                    tdClass: "text-center"
                },
                {
                    label: this.$t("WALLET_BLOCK_PRODUCERS.USERNAME"),
                    field: "username",
                    tdClass: "w-7/8"
                },
                {
                    label: this.$t("WALLET_BLOCK_PRODUCERS.APPROVAL"),
                    field: "newVotePercent",
                    type: "percentage",
                    tdClass: "w-8"
                }
            ];
        },

        currentWallet () {
            return this.wallet_fromRoute;
        },

        isExplanationDisplayed () {
            return this.$store.getters["app/showVotingExplanation"];
        },

        votingUrl () {
            return "https://docs.solar.org/desktop-wallet/introduction-to-solar-rewards";
        }
    },

    watch: {
        currentVotes () {
            this.fetchBlockProducers();
        },
        filterSearch () {
            this.filter();
        },
        newVotesProp () {
            this.updateVotes();
        }
    },

    mounted () {
        this.fetchBlockProducers();
    },

    methods: {
        calculateVoteAmount (blockProducers) {
            const votes = {};
            try {
                let remainder = this.currentWallet.balance;
                for (const [blockProducer, percent] of Object.entries(blockProducers)) {
                    const balance = Math.trunc((this.currentWallet.balance * percent) / 10000);
                    votes[blockProducer] = balance;
                    remainder -= balance;
                }
                const keys = Object.keys(votes);

                if (remainder <= this.activeBlockProducers) {
                    for (let i = 0; i < remainder; i++) {
                        votes[keys[i]]++;
                    }
                }
            } catch {
                //
            }
            return votes;
        },

        dismissExplanation () {
            this.$store.dispatch("app/setVotingExplanation", false);
        },

        emitNewPercentage (value, blockProducer) {
            this.$emit("on-block-producer-percentage-change", value, blockProducer);
        },

        offline (username) {
            const blockProducer = this.blockProducers.find(blockProducer => blockProducer.username === username) ?? {};
            return blockProducer.version === undefined && !blockProducer.isResigned;
        },

        resigned (username) {
            const blockProducer = this.blockProducers.find(blockProducer => blockProducer.username === username) ?? {};
            return blockProducer.isResigned;
        },

        async fetchBlockProducers () {
            if (this.isLoading) {
                return;
            }

            try {
                this.isLoading = true;

                const walletVotes = this.currentVotes ?? [];
                const votedUsernames = Object.keys(walletVotes);

                const allBlockProducers = [];
                let page = 1;
                let apiBlockProducers;
                while ((apiBlockProducers = (await this.$client.fetchBlockProducers({
                    page,
                    limit: 100
                })).blockProducers).length > 0) {
                    for (const blockProducer of apiBlockProducers) {
                        allBlockProducers.push(blockProducer);
                    }
                    page++;
                }

                this.blockProducers = allBlockProducers.map(blockProducer => {
                    blockProducer.votePercent = walletVotes[blockProducer.username] || 0;
                    blockProducer.newVotePercent = this.newVotesProp[blockProducer.username] || 0;
                    return blockProducer;
                }).filter((blockProducer) => votedUsernames.includes(blockProducer.username) || blockProducer.version !== undefined || blockProducer.isResigned);

                this.updateVotes();

                this.filter();
            } catch (error) {
                this.$logger.error(error);
                this.$error(this.$t("COMMON.FAILED_FETCH", {
                    name: "blockProducers",
                    msg: error.message
                }));
                this.blockProducers = [];
                this.filter();
            } finally {
                this.isLoading = false;
            }
        },

        formatPercentage (value) {
            return value / 100;
        },

        onSortChange (sortOptions) {
            const params = sortOptions[0];

            if (!isEqual(params, this.queryParams.sort)) {
                this.__updateParams({
                    sort: params
                });
                this.blockProducers = this.blockProducers.slice().sort((a, b) => {
                    const asc = this.queryParams.sort.type === "asc";
                    const field = this.queryParams.sort.field;
                    if (a[field] < b[field]) return -1 * (asc ? 1 : -1);
                    else if (a[field] > b[field]) return 1 * (asc ? 1 : -1);
                    return 0;
                });
                this.filter();
            }
        },

        onRowClick ({ row }) {
            this.$refs["percentageInput-" + row.username].focus();
        },

        filter () {
            this.shownBlockProducers = this.blockProducers.filter((blockProducer) => !this.filterSearch || blockProducer.username.includes(this.filterSearch));
            this.totalCount = this.shownBlockProducers.length;
        },

        reset () {
            this.currentPage = 1;
            this.queryParams.page = 1;
            this.totalCount = 0;
            this.blockProducers = [];
        },

        sortVotes (votes) {
            return Object.fromEntries(Object.entries(votes).sort((a, b) => {
                if (b[1] > a[1]) {
                    return 1;
                } else if (b[1] < a[1]) {
                    return -1;
                } else {
                    return a[0].localeCompare(b[0], "en", { numeric: true });
                }
            }));
        },

        updateVotes () {
            const blockProducers = {};
            this.blockProducers = this.blockProducers.map(blockProducer => {
                blockProducer.newVotePercent = this.newVotesProp[blockProducer.username] || 0;
                if (blockProducer.newVotePercent > 0) {
                    blockProducers[blockProducer.username] = blockProducer.newVotePercent;
                }
                return blockProducer;
            });

            const votes = this.calculateVoteAmount(this.sortVotes(blockProducers));

            this.blockProducers = this.blockProducers.map(blockProducer => {
                blockProducer.voteBalance = votes[blockProducer.username] ?? 0;
                return blockProducer;
            });

            this.filter();
        },

        __updateParams (newProps) {
            this.queryParams = Object.assign({}, this.queryParams, newProps);
        }
    }
};
</script>

<style scoped>
.WalletBlockProducers__explanation__close {
  top: 0;
  margin-bottom: auto;
  margin-top: 5px;
}

</style>

<style>
.WalletBlockProducers .ButtonClose__cross {
  color: var(--theme-explanation-text)
}
</style>
