const fs = require('fs')

class VersionManager {
  constructor () {
    this.currentVersion = null
    this.versions = []
  }

  loadVersions (versionsFilePath) {
    if (fs.existsSync(versionsFilePath)) {
      this.versions.splice(0, this.versions.length, ...JSON.parse(fs.readFileSync(versionsFilePath).toString()))
      this.currentVersion = this.versions[0]
    }
  }
}
const manager = new VersionManager()

module.exports = manager
