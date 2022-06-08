export class SolarTransport {
    constructor () {
        this.appName = jest.fn(() => "Solar");
        this.getVersion = jest.fn(() => "1.0.0");
        this.getPublicKey = jest.fn(() => "034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192");
        this.getExtPublicKey = jest.fn(() => "034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed1928d6fcfb5d4a9dbfc1084915c390e86e9d66eb511a9046dece25a6a6b9fc89904");
        this.signMessage = jest.fn(() => "SIGNATURE");
        this.signTransaction = jest.fn(() => "SIGNATURE");
    }
}
