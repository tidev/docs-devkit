#! groovy
library 'pipeline-library'

def publishableBranches = ['develop']
def nodeVersion = '10.15.0'
def yarnVersion = '1.16.0'

timestamps {
  node('(osx || linux) && git && npm-publish') {
    nodejs(nodeJSInstallationName: "node ${nodeVersion}") {
      ansiColor('xterm') {
        stage('Checkout') {
          checkout([
            $class: 'GitSCM',
            branches: scm.branches,
            extensions: scm.extensions + [[$class: 'CleanBeforeCheckout'], [$class: 'LocalBranch', localBranch: "**"]],
            submoduleCfg: [],
            userRemoteConfigs: scm.userRemoteConfigs
          ])
          ensureYarn(yarnVersion)
        }
        stage('Prepare') {
          sh 'yarn'
        }
        stage('Lint') {
          sh 'yarn lint'
        }
        if(publishableBranches.contains(env.BRANCH_NAME)) {
          stage('Publissh') {
            sh 'yarn run lerna:publish'
            pushGit(name: env.BRANCH_NAME)
          }
        }
      }
    }
  }
}
