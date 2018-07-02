'use strict'
const fs = require('fs')
const path = require('path')
const notifier = require('node-notifier')
const CronJob = require('cron').CronJob
const fse = require('fs-extra')
const meow = require('meow')
const chalk = require('chalk')
const readPkg = require('read-pkg')
const dotProp = require('dot-prop')
const { findIndex } = require('lodash')
const dtInfo = require('dt-info')
const pify = require('pify')
const rimraf = require('rimraf')
const ora = require('ora')

class ClearTemp {
    constructor() {
        this.tempDir = require('os').tmpdir()
        this.logger = console
        this.spinner = ora('Please wait ...')
        this.spinner.color = 'yellow'
        this.options = {
            sound: false
        }
        readPkg(__dirname).then(pkg => {
            this.init(pkg)
        })
    }

    init(pkg) {
        const cli = meow(`
            ${chalk.yellow('Usage')}:
                ${chalk.green(`${pkg.name} <option>`)}

            ${chalk.yellow('Options')}:
                ${chalk.green('version')},  Get clear-temp cli version
                ${chalk.green('sound')},   Notification sound. Default: ${chalk.green('false')}
       
            ${chalk.yellow('Examples')}:
                $ ${chalk.green('clear-temp')} --help
                $ ${chalk.green('clear-temp')} version
                $ ${chalk.green('clear-temp')} sound
        `)
  
        if(cli.input.length) {
            if(cli.input[0].indexOf('version') > -1) {
                return this.version()
            }
            if(cli.input[0].indexOf('sound') > -1) {
                this.options['sound'] = true;
            }
            this.cron()
        } else {
            this.cron()
        }
    }

    version() {
        return readPkg(__dirname).then(pkg => {
            return this.logger.log(chalk.green(`${dotProp.get(pkg, 'name')} version: ${chalk.green('v') + dotProp.get(pkg, 'version')}`))
        })
    }

    async emptyTemp() {
        const dir = this.tempDir
        try {
            await pify(fs.readdir)(dir).then(files => {
                return Promise.all(files.map(file => pify(rimraf, { maxBusyTries: 1000 })(path.join(dir, file))))
            })
            this.notifier(false)
        } catch (err) {
            // this.logger.log(err) // debug purpose
            this.notifier(false)
        }
    }

    cron() {
        this.spinner.start()
        dtInfo.info(['hours', 'minutes', 'seconds']).then(result => {
            try {
                const job = new CronJob({
                    cronTime: `${parseInt(result.seconds) + 1} ${result.minutes} ${result.hours} * * 0-6`,
                    onTick: () => {
                        this.emptyTemp()
                    },
                    start: false
                });
                job.start()
            } catch (ex) {
                this.logger.log(chalk("cron pattern not valid"));
            }
        }).catch(error => {
            this.logger.log('error', error)
        })
    }

    notifier(isError) {
        const _message = isError ? 'Failed to clear' : 'Successfully cleared'
        return notifier.notify(
            {
                title: 'Clear Temp',
                message: _message,
                icon: path.join(__dirname, 'alarm.png'), // Absolute path (doesn't work on balloons)
                sound: this.options.sound, // Only Notification Center or Windows Toasters
                wait: false // Wait with callback, until user action is taken against notification
            }, (err, response) => {
                // Response is response from notification
                this.spinner.text = _message
                isError ? this.spinner.fail() : this.spinner.succeed()
                process.exit(1)
            }
        )
    }
}

module.exports = Object.assign(new ClearTemp(), { ClearTemp });