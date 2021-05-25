import ZohoDeskClient from './lib/ZohoDeskClient.js';
import fs from 'fs/promises';
import minimist from 'minimist';

var argv = minimist(process.argv.slice(2), { string: 'view-id' });

(async() => {
    switch (argv._[0]) {
        case 'get':
            switch (argv._[1]) {
                case 'tickets':
                    const configRaw = await fs.readFile('config.json', 'utf-8');
                    const config = JSON.parse(configRaw);
                    console.log('Config Loaded');

                    const zClient = new ZohoDeskClient(config.refreshToken, config.clientId, config.clientSecret, config.orgId);

                    const tickets = await zClient.getTicketsFromView(argv['view-id']);
                    const ticketsWithBody = [];

                    await asyncForEach(tickets, async(t) => {
                        let tmp = await zClient.getTicketBody(t.id);
                        t.firstThread = tmp;

                        ticketsWithBody.push(t);
                        console.log(t);
                        await sleep(2000);
                    });

                    let dest = undefined;

                    if (argv.out) {
                        dest = argv.out;
                    } else if (argv.O) {
                        dest = argv.out;
                    } else {
                        const d = new Date();
                        dest = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-results.json`;
                    }

                    await fs.writeFile(dest, JSON.stringify(ticketsWithBody));

                    break;
            }
            break;
        case 'parse':
            switch (argv._[1]) {
                case 'tickets':
                    let src = argv._[2];
                    if (!src) throw 'Missing input file'
                    const fileRaw = await fs.readFile(src, 'utf-8');
                    const file = JSON.parse(fileRaw);
                    const rows = [
                        ['id', 'name', 'contactEmail', 'summary', 'subject', 'ticketNumber', 'channel', 'url']
                    ];

                    file.forEach(t => {
                        rows.push([
                            `"${t.id ? t.id.replace('"', '') : ''}"`,
                            `"${t.contact.firstName ? t.contact.firstName : ''} ${t.contact.lastName ? t.contact.lastName : ''}"`.trim(),
                            `"${t.contact.email ? t.contact.email.replace('"', '').replace("“", "").replace("”", "") : ''}"`,
                            `"${t.firstThread.summary ? t.firstThread.summary.replace('"', '').replace("", " ").replace("“", "").replace("”", "") : ''}"`,
                            `"${t.subject ? t.subject.replace('"', '').replace(",", " ") : ''}"`,
                            `"${t.ticketNumber ? t.ticketNumber.replace('"', '') : ''}"`,
                            `"${t.channel ? t.channel.replace('"', '') : ''}"`,
                            `"${t.webUrl ? t.webUrl.replace('"', '') : ''}"`,
                        ]);
                    });

                    let csv = rows.map(e => e.join(',')).join("\n");

                    let dest = undefined;

                    if (argv.out) {
                        dest = argv.out;
                    } else if (argv.O) {
                        dest = argv.out;
                    } else {
                        const d = new Date();
                        dest = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-parsed.csv`;
                    }

                    await fs.writeFile(dest, csv, 'utf-8');

                    break;
            }
            break;

    }
    process.exit();
})();

const sleep = (delay) => {
    return new Promise(function(resolve) {
        setTimeout(resolve, delay);
    });
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}