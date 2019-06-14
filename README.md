
# GithubHop

A chrome extension that enables you to navigate to the source file or documentation page of classes, interfaces, traits, functions and constants.

This will perform ok on files up to a couple of thousand lines, however, as the parsing is currently quite inefficient, really large files combined with slower systems may take over a second to process, however this does not block interaction with the page.

## Requirements
Only PHP (psr-0 and psr-4) is supported. This extension also assumes that all PSR standards are respected in the file you are browsing. If this is not the case then you might experience incorrect behavior (e.g. casing is not compliant).

Do the lookup the extension depends on the composer.json and the composer.lock file.

In order to navigate to the source file of external dependencies it is required that repository you are browsing contains the lock file. The reason for that is that the lock file contains the mapping of namespace to directory for these external dependencies. If there is no lock file the extension will still link to imports from within the same repository, but for external imports a google search will be performed instead (`github ${namespace}`) as a fallback.

## Usage
You can navigate from the imports or from usages of imported classes by clicking on them. If a member on the imported class is used the extension will try to point to the line where that member is declared (works in most but not all cases).

If you click a member that is part of the parent class then clicking will link to the inheriting class first and won't find the member. However if you then directly navigate to the parent class by clicking its name in the extends clause, the extension will search for the member in the parent class.

Each usage at the top displays a popup on hover that contains links to all occurrences in the current file (except phpdoc, if no popup is shown then there are only usages in phpdoc, or it is an unused import).

For global constants, functions and classes the extension links to the corresponding documentation page on php.net.

A context menu item is also added to search for selected text in the current repository.

## Caveats
- For certain cases (phpdoc, function calls) the extension will modify the html of the file contents. This is because for those cases github by default puts the symbols into a textNode, potentially together with other symbols. The extension splits the textNode and replaces the relevant parts with span elements so that these can have event listeners attached.

## TODO
- migrate to typescript
- support other languages
- configurable mouse buttons for navigation
- maybe use a javascript PHP interpreter
- clean up parsing...
- cache invalidation
- link to the correct version of the package (by somehow mapping the composer version to a github branch or tag). Currently 
- try resolve external dependencies when there is no lock file (list of common mappings?, google search?, user prompt?)
