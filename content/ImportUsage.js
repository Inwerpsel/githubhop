class ImportUsage {
    constructor(line, symbol) {
        this.line = line
        this.symbol = symbol
        this.isMemberAccess = this.symbol.targetSymbol && this.symbol.targetSymbol.isStaticAccessor
    }
}