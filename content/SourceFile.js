class SourceFile {
    constructor(username,
                repository,
                branch,
                filename,
                lines,
                imports,
                inlineImports,
                currentClass
    ) {
        this.username = username
        this.repository = repository
        this.branch = branch
        this.filename = filename
        this.lines = lines
        this.imports = imports
        this.inlineImports = inlineImports
        this.currentClass = currentClass
    }

    static fromUrlAndDocument(
        url,
        document
    ) {
        let matches = url.match(/^https:\/\/github\.com\/([\w-_]+)\/([\w-_]+)\/blob\/([\w-_\.]+)\/(.+\.(\w+))/)

        if (matches === null) {
            throw "location not github file"
        }

        let username = matches[1]
        let repository = matches[2]
        let branch = matches[3]
        let filename = matches[4]
        let extension = matches[5]

        if (!SourceFile.supportsExtension(extension)) {
            console.log(`Detected a source file on github but extension "${extension}" is not supported.`)
            throw "extension not supported"
        }

        let lines = CodeLine.getAllFromDocument(document)

        let currentClass = lines.find(line=> line.getClassSymbol()).getClassSymbol().targetSymbol.text

        let imports = Import.getAllFromLines(lines)

        // let subImports = SubImport.getAllFromLines(imports, lines)

        let inlineImports = InlineImport.getAllFromLines(lines)

        let sourceFile = new SourceFile(
            username,
            repository,
            branch,
            filename,
            lines,
            imports,
            inlineImports,
            currentClass
        )

        sourceFile.findImportUsages()

        return  sourceFile
    }

    static supportsExtension(extension) {
        return [
            'php'
        ].includes(extension)
    }

    getLinesAfterLastImport() {
        if (!this.linesAfterLastImport) {
            let lastImport = this.imports[this.imports.length - 1]

            this.linesAfterLastImport = this.lines.filter(
                line => line.number > lastImport.line.number
            )
        }

        return this.linesAfterLastImport
    }

    findImportUsages() {
        if (this.imports.length === 0) {
            return
        }

        let longestImportRight = this.imports.reduce(
            (biggestRight, anImport) => Math.max(anImport.targetSymbol.domElement.getBoundingClientRect().right, biggestRight),
            0
        )

        this.imports.forEach((anImport) => {
            // Search code for occurrences
            anImport.fetchUsagesAndSubImports(this)
            anImport.generateUsagesPopup(longestImportRight)
        })
    }
}