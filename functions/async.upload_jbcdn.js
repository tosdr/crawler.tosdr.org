const package = require('../package');
const uuid = require('uuid');
var FormData = require('form-data');
const https = require('https');
//const querystring = require('querystring');
var FormData = require('form-data');
const axios = require('axios');

module.exports = async function upload_jbcdn(_data) {

    let UserAgent = `ToSDRCrawler/${package.version} (+https://tosdr.org)`;


    return new Promise((resolve, reject) => {

        var form = new FormData();
        form.append('file', Buffer.from(_data, 'base64'), { filename: 'tmp.png' });

        const formHeaders = form.getHeaders();

        axios.post(`https://${process.env.JBCDN_SLUG}.imp.jbcdn.net/crawler/captures/${uuid.v4()}.png`, form, {
            headers: {
                'User-Agent': UserAgent,
                'upkey': process.env.JBCDN_UPKEY,
                'ttl': process.env.JBCDN_TTL,
                ...formHeaders
            },
        }).then(response => resolve(response)).catch(error => reject(error.response.data.message))
    });
}