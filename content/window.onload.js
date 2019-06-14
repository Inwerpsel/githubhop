let sourceFile

(function () {
    let member = window.location.hash.split('member=')[1]

    if (typeof member !== 'undefined') {
        console.log('start looking for' + member)
        let targetLine
        let memberEscaped = member.replace(/\$/, '\\$')
        let memberRegex = new RegExp(
            `((public |protected |private )(static )?\\$?|function |const )&?${memberEscaped}( |;|\\(|\=)`
        )

        let matchingLine = [...document.querySelectorAll('[id^=LC]')].find(line=> line.textContent.match(memberRegex))

        if (typeof matchingLine !== 'undefined') {
            targetLine = matchingLine
        } else {
            // search for class line
            targetLine = [...document.querySelectorAll('[id^=LC]')].find(line => line.textContent.match(
                /(class|trait|interface) [A-Z]\w*/
            ))

        }

        window.location.hash = `#L${targetLine.id.replace(/^LC/, '')}`

        // change the hash back to the member to that it can be used when navigating to parent
        if (typeof  matchingLine === 'undefined') {
            window.location.hash = `#member=${member}`
        }
    }

    try {
        let tStart = (new Date).getTime()
        sourceFile = SourceFile.fromUrlAndDocument(window.location.href, document)
        console.log(`${(new Date).getTime() - tStart} ms to parse source file`)
    } catch (error) {
        if (error === 'location not github file') {
            console.log(error)

            return
        } else if (error === 'extension not supported') {
            console.log(`extension not supported for ${window.location.href}`)

            return
        } else {
            throw error
        }
    }

    if (sourceFile.imports.length === 0 && sourceFile.inlineImports.length === 0) {
        return
    }

    chrome.runtime.sendMessage({
        "message": "imports_found",
        "username": sourceFile.username,
        "repository": sourceFile.repository,
        "branch": sourceFile.branch
    })

    sourceFile.findImportUsages()
})()