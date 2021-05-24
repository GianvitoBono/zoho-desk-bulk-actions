import ZohoDeskClient from './lib/ZohoDeskClient.js';
import fs from 'fs/promises';
import minimist from 'minimist';

var argv = minimist(process.argv.slice(2), { string: 'view-id' });

(async() => {
    switch (argv._[0]) {
        case 'get':
            console.log(argv);
            switch (argv._[1]) {
                case 'tickets':
                    const configRaw = await fs.readFile('config.json', 'utf-8');
                    const config = JSON.parse(configRaw);
                    console.log('Config Loaded');

                    const zClient = new ZohoDeskClient(config.refreshToken, config.clientId, config.clientSecret, config.orgId);

                    const tickets = await zClient.getTicketsFromView(argv['view-id']);

                    let dest = undefined;

                    if (argv.out) {
                        dest = argv.out;
                    } else if (argv.O) {
                        dest = argv.out;
                    } else {
                        const d = new Date();
                        dest = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-results.json`;
                    }

                    await fs.writeFile(dest, JSON.stringify(tickets));

                    break;
            }
            break;

    }
    process.exit();
})();