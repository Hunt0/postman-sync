const o2p = require('openapi-to-postmanv2');
const axios = require('axios');
require('dotenv').config();

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const WORKSPACE_ID = process.env.POSTMAN_WORKSPACE_ID;
const SYNC_FROM = process.env.SYNC_FROM;

if (!POSTMAN_API_KEY || !WORKSPACE_ID) {
    console.error('Please set POSTMAN_API_KEY and WORKSPACE_ID in your environment variables.');
    return;
}

async function main() {
    const baseUrl = 'https://api.getpostman.com';

    const { data } = await axios.get(`${baseUrl}/collections?workspace=${WORKSPACE_ID}`, {
        headers: {
            'X-API-Key': POSTMAN_API_KEY
        }
    });

    console.log(data.collections);

    const toSync = SYNC_FROM.split(',').map(item => item.trim());
    const specs = [];

    for (const url of toSync) {
        try {
            const openapiSpec = await axios.get(url);
            specs.push(openapiSpec.data);
            console.info(`Retrieved OpenAPI spec for ${url}`);
        } catch (error) {
            console.warn(`Error fetching OpenAPI spec for ${url}`);
        }
    }

    for (const spec of specs) {
        o2p.convert({ type: 'string', data: spec },
            {}, async (err, conversionResult) => {
                if (!conversionResult.result) {
                    console.error('Could not convert open api spec to postman collection', conversionResult.reason);
                }
                else {
                    console.log(`Collection converted - ${collection.info.name}`, conversionResult.output[0].data);
                    const existing = data.collections.find(c => c.name === collection.info.name);

                    if (existing != null) {
                        console.log(`Existing postman collection for "${collection.info.name}" will be replaced`);

                        //console.log("EXISTING: " + existing.id);
                        try {
                            await axios.delete(`${baseUrl}/collections/${existing.id}`, {
                                headers: {
                                    'X-API-Key': POSTMAN_API_KEY
                                }
                            });
                        } catch (error) {
                            console.error("Failed to delete existing postman collection");
                        }
                    }
                    
                    if (collection.auth == null) {
                        collection.auth = {
                            type: "bearer",
                            bearer: [
                                {
                                    key: "token",
                                    value: "{{clerkSessionJwt}}",
                                    type: "string"
                                }
                            ]
                        };
                    }
                    
                    try {
                        await axios.post(`${baseUrl}/collections`, {
                            collection: conversionResult.output[0].data
                        }, {
                            headers: {  
                                'X-API-Key': POSTMAN_API_KEY
                            }
                        });
                    } catch (error) {
                        console.error("Failed to create postman collection");
                    }
                }
            }
        );
    }
}

main();
