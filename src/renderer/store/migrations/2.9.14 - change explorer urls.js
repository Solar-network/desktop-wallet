import { clone } from "lodash";

export default store => {
    store.getters["network/all"].forEach(network => {
        const updatedNetwork = clone(network);

        if (updatedNetwork.explorer === "https://explorer.solar.org") {
            updatedNetwork.explorer = "https://solarscan.com";
        } else if (updatedNetwork.explorer === "https://texplorer.solar.org") {
            updatedNetwork.explorer = "https://testnet.solarscan.com";
        }

        store.dispatch("network/update", updatedNetwork);
    });

    store.dispatch("app/setLatestAppliedMigration", "2.9.14");
};
