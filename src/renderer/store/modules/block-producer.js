import BlockProducerModel from "@/models/block-producer";
import Vue from "vue";

export default {
    namespaced: true,

    state: {
        blockProducers: {}
    },

    getters: {
        all: (state, _, __, rootGetters) => {
            const network = rootGetters["session/network"];
            if (!network || !state.blockProducers[network.id]) {
                return false;
            }

            return state.blockProducers;
        },

        bySessionNetwork: (state, _, __, rootGetters) => {
            const network = rootGetters["session/network"];
            if (!network || !state.blockProducers[network.id]) {
                return false;
            }

            return state.blockProducers[network.id];
        },

        byAddress: (state, _, __, rootGetters) => address => {
            const network = rootGetters["session/network"];

            if (!address || !network || !state.blockProducers[network.id]) {
                return false;
            }

            return state.blockProducers[network.id][address] || false;
        },

        byUsername: (state, _, __, rootGetters) => username => {
            const network = rootGetters["session/network"];

            if (!username || !network || !state.blockProducers[network.id]) {
                return false;
            }

            return Object.values(state.blockProducers[network.id]).find(blockProducer => {
                return blockProducer.username === username;
            }) || false;
        },

        byPublicKey: (state, _, __, rootGetters) => publicKey => {
            const network = rootGetters["session/network"];

            if (!publicKey || !network || !state.blockProducers[network.id]) {
                return false;
            }

            return Object.values(state.blockProducers[network.id]).find(blockProducer => {
                return blockProducer.publicKey === publicKey;
            }) || false;
        },

        search: (state, getters) => query => {
            if (query.length <= 20) {
                return getters.byUsername(query);
            } else if (query.length <= 34) {
                return getters.byAddress(query);
            } else {
                return getters.byPublicKey(query);
            }
        }
    },

    mutations: {
        SET_BLOCK_PRODUCERS (state, { blockProducers, networkId }) {
            const result = blockProducers.reduce((acc, blockProducer) => {
                acc[blockProducer.address] = blockProducer;

                return acc;
            }, {});

            Vue.set(state.blockProducers, networkId, result);
        },
        ADD_BLOCK_PRODUCER (state, { blockProducer, networkId }) {
            Vue.set(state.blockProducers, networkId, { [blockProducer.address]: blockProducer });
        }
    },

    actions: {
        async load ({ dispatch }) {
            const blockProducers = [];

            const blockProducerPage1 = await this._vm.$client.fetchBlockProducers({
                page: 1,
                limit: 100
            });

            const requests = [];
            for (let page = 2; page <= blockProducerPage1.meta.pageCount; page++) {
                requests.push(this._vm.$client.fetchBlockProducers({
                    page,
                    limit: 100
                }));
            }

            const blockProducerPages = [blockProducerPage1, ...await Promise.all(requests)];
            for (const page of blockProducerPages) {
                blockProducers.push(...page.blockProducers);
            }

            dispatch("set", blockProducers);
        },

        set ({ commit, rootGetters }, blockProducers) {
            const network = rootGetters["session/network"];
            commit("SET_BLOCK_PRODUCERS", {
                blockProducers: blockProducers.map(blockProducer => BlockProducerModel.deserialize(blockProducer)),
                networkId: network.id
            });
        },

        add ({ commit, rootGetters }, blockProducer) {
            const network = rootGetters["session/network"];
            commit("ADD_BLOCK_PRODUCER", {
                blockProducer: BlockProducerModel.deserialize(blockProducer),
                networkId: network.id
            });
        }
    }
};
