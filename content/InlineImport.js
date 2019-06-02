class InlineImport {
    constructor(symbol, fqcn) {
        this.symbol = symbol
        this.fqcn = fqcn
        this.isGlobalImport = this.fqcn.indexOf('\\') === -1
    }

    static getAllFromLines(lines) {
        return lines.reduce((result, line) => {
            let lineInlineImports = line.symbols.filter(symbol => symbol.isInlineImport).map(symbol => {
                let fqcn

                fqcn = symbol.text

                if (symbol.targetSymbol) {
                    fqcn += symbol.targetSymbol.text
                }

                fqcn = fqcn.replace(/^\\/, '')

                return new InlineImport(symbol, fqcn)
            })

            result.push(...lineInlineImports)

            return result
        }, [])
    }
}