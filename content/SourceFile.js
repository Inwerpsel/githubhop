class SourceFile {
    constructor(username,
                repository,
                branch,
                filename,
                lines,
                imports
    ) {
        this.username = username
        this.repository = repository
        this.branch = branch
        this.filename = filename
        this.lines = lines
        this.imports = imports
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

        if (!SourceFile.extensionIsSupported(extension)) {
            console.log(`Detected a source file on github but extension "${extension}" is not supported.`)
            throw "extension not supported"
        }

        let lines = CodeLine.getAllFromDocument(document)

        let imports = Import.getAllFromLines(lines)

        return new SourceFile(
            username,
            repository,
            branch,
            filename,
            lines,
            imports
        )
    }

    static extensionIsSupported(extension) {
        return [
            'php'
        ].includes(extension)
    }
}