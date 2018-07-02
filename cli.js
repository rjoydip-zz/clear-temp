'use strict'
const notifier = require('node-notifier')
const CronJob = require('cron').CronJob
const fse = require('fs-extra')
const meow = require('meow')
const chalk = require('chalk')
const readPkg = require('read-pkg')
const dotProp = require('dot-prop')
const { findIndex } = require('lodash')

class ClearTemp {
    constructor() {
        this.commands = ['time', 'day', 'version']
        this.alias = ['t', 'd', 'v']
        this.tempDir = require('os').tmpdir()
        this.logger = console
        readPkg(__dirname).then(pkg => {
            this.init(pkg)
        })
    }

    init(pkg) {
        const cli = meow(`
            ${chalk.yellow('Usage')}:
                ${chalk.green(`${pkg.name} <option>`)}

            ${chalk.yellow('Options')}:
                ${chalk.green('time')}, ${chalk.cyan('t')}  Set a time to clear (eg: 00:20:08)    
                ${chalk.green('day')},  ${chalk.cyan('d')}  Set a "day of week" to clear (eg: 0-6 (Sun-Sat))
                ${chalk.green('version')},  ${chalk.cyan('v')}  Get clear-temp cli version
       
            ${chalk.yellow('Examples')}:
                $ ${chalk.green('clear-temp')} --help
                $ ${chalk.green('clear-temp')} version
                $ ${chalk.green('clear-temp')} time
                $ ${chalk.green('clear-temp')} day
        `)

        if (cli.input.length === 0) {
            this.logger.log(chalk.red('Specify at least one path'))
            process.exit(1)
        } else {
            /** TODO: */
            this.exeCmd(this.formatInput(cli.input))
        }
    }

    exeCmd(input) {
        const DEFAULT_DAY_RANGE = '0-6'
        const DEFAULT_TIME = '00:01:00'

        if (findIndex(input, ['input', 'version']) > -1) {
            this.version()
        }

        const DAY_INDEX = findIndex(input, ['input', 'day'])
        const TIME_INDEX = findIndex(input, ['input', 'time'])

        if (DAY_INDEX > -1 || TIME_INDEX > -1) {
            if (DAY_INDEX > -1 && TIME_INDEX < 0) {
                this.cron({
                    day: input[DAY_INDEX].value,
                    time: DEFAULT_TIME
                })
            } else if (TIME_INDEX > -1 && DAY_INDEX < 0) {
                this.cron({
                    time: input[TIME_INDEX].value,
                    day: DEFAULT_DAY_RANGE
                })
            } else {
                this.cron({
                    time: input[TIME_INDEX].value,
                    day: input[DAY_INDEX].value
                })
            }
        } else {
            this.cron({
                time: DEFAULT_TIME,
                day: DEFAULT_DAY_RANGE
            })
        }
    }

    formatInput(input) {
        let opt = [];
        for (let index = 0; index < input.length; index++) {
            if (input[index] === 'version') {
                opt.push({
                    input: input[index],
                    value: null
                })
            } else {
                if (this.commands.indexOf(input[index]) > -1 || this.alias.indexOf(input[index]) > -1) {
                    opt.push({
                        input: input[index],
                        value: input[index + 1]
                    })
                    index++
                } else {
                    index++
                }
            }
        }
        return opt
    }

    version() {
        return readPkg(__dirname).then(pkg => {
            return this.logger.log(chalk.green(`${dotProp.get(pkg, 'name')} version: ${chalk.green('v') + dotProp.get(pkg, 'version')}`))
        })
    }

    emptyTemp() {
        fse.emptyDir(this.tempDir, err => {
            if (err) return this.logger.error(err)
            else this.notifier()
        })
    }

    cron(value) {
        this.logger.log(value)
        const job = new CronJob({
            cronTime: `00 59 13 * * ${value.day}`,
            // cronTime: `${value.time.split(':')} * * ${value.day}`,
            onTick: () => {
                this.logger.log(chalk.green('cron'))
                this.notifier() // for notification test
                // this.emptyTemp()
            },
            start: false
        });
        job.start()
        process.exit(1)
    }

    notifier() {
        return notifier.notify(
            {
                title: 'Clear Temp',
                message: 'Temp has been cleared',
                // icon: path.join(__dirname, 'coulson.jpg'), // Absolute path (doesn't work on balloons)
                sound: true, // Only Notification Center or Windows Toasters
                wait: false // Wait with callback, until user action is taken against notification
            }, (err, response) => {
                // Response is response from notification
                process.exit(1)
            }
        )
    }
}

module.exports = Object.assign(new ClearTemp(), { ClearTemp });