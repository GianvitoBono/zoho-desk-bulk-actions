import axios from 'axios';
import fs from 'fs/promises';

export default class ZohoDeskClient {
    headers = {
        Authorization: undefined,
        orgId: undefined,
    };
    credsFile = {
        accessToken: undefined,
        expireDate: undefined,
    };
    refreshToken = undefined;
    clientId = undefined;
    clientSecret = undefined;
    orgId = undefined;

    constructor(refreshToken, clientId, clientSecret, orgId) {
        try {
            if (!refreshToken) throw 'Missing refreshToken';
            if (!clientId) throw 'Missing clientId';
            if (!clientSecret) throw 'Missing clientSecret';
            if (!orgId) throw 'Missing orgId';

            this.refreshToken = refreshToken;
            this.clientId = clientId;
            this.clientSecret = clientSecret;
            this.orgId = orgId;

            this.headers.orgId = orgId;

        } catch (error) {
            console.error(error);
        }
    }

    async checkCreds() {
        if (await this.isStoredTokenValid()) {
            this.headers.Authorization = `Zoho-oauthtoken ${this.credsFile.accessToken}`;
        } else {
            const token = await this.getAccessTokenFromZoho();
            this.headers.Authorization = `Zoho-oauthtoken ${token}`;
        }
    }

    async isStoredTokenValid() {
        try {
            const credsRaw = await fs.readFile('zoho-creds.json', 'utf-8');
            const creds = JSON.parse(credsRaw);

            if (this.secondsSinceEpoch() < creds.expireDate) {
                if (!this.credsFile.accessToken) await this.getStoredToken();
                return true;
            }
            return false;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    async getStoredToken() {
        try {
            const credsRaw = await fs.readFile('zoho-creds.json', 'utf-8');
            const creds = JSON.parse(credsRaw);
            if (this.secondsSinceEpoch() < creds.expireDate) {
                this.credsFile = creds;
                return creds;
            }
            return false;
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    async getAccessTokenFromZoho() {
        try {
            const validStoredToken = await this.isStoredTokenValid();
            if (!validStoredToken) {
                let response = await axios.post("https://accounts.zoho.com/oauth/v2/token", {}, {
                    params: {
                        refresh_token: this.refreshToken,
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        grant_type: 'refresh_token'
                    }
                });
                if (!response.data.access_token) throw 'Missing access token on Zoho reply';

                const toFile = {
                    accessToken: response.data.access_token,
                    expireDate: this.secondsSinceEpoch() + 3600
                };

                this.credsFile = toFile;

                await fs.writeFile('zoho-creds.json', JSON.stringify(toFile), 'utf-8');
                return response.data.access_token;
            } else {
                if (!this.credsFile.accessToken) {
                    this.credsFile = await this.getStoredToken();
                    return this.credsFile.accessToken;
                }
                return this.credsFile.accessToken;
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    async getTicketsFromView(viewId) {
        try {
            let tickets = [];
            await this.checkCreds();
            let from = 1;
            let tmp = undefined;
            do {
                tmp = await axios({
                    method: 'get',
                    headers: this.headers,
                    url: `https://desk.zoho.com/api/v1/tickets?include=contacts,assignee,departments,team,isRead&limit=100&from=${from}&viewId=${viewId}`
                });
                from = from + 100;
                tickets = [...tickets, ...tmp.data.data]
            } while (tmp.data.data.length === 100)

            return tickets;
        } catch (error) {
            console.error(error);
        }
    }

    async getTicketBody(id) {
        try {
            await this.checkCreds();
            const ticket = await axios.get(`https://desk.zoho.com/api/v1/tickets/${id}/threads`, {
                headers: this.headers
            });
            return ticket.data.data[ticket.data.data.length - 1];
        } catch (error) {
            console.error(JSON.stringify(error, null, 4));
        }
    }

    secondsSinceEpoch() { return Math.floor(Date.now() / 1000) }
}