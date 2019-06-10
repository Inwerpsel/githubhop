class ImportUsage {
    constructor(line, symbol, isParentClass) {
        this.line = line
        this.symbol = symbol
        this.isParentClass = isParentClass
        this.isMemberAccess = this.symbol.targetSymbol && this.symbol.targetSymbol.isStaticAccessor
    }
}