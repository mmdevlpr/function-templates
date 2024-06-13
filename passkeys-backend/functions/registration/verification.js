const axios = require('axios');

const assets = Runtime.getAssets();
const { detectMissingParams, errorLogger } = require(assets[
  '/services/helpers.js'
].path);

// eslint-disable-next-line consistent-return
exports.handler = async (context, event, callback) => {
  const { API_URL, ACCOUNT_SID, AUTH_TOKEN } = context;

  const missingParams = detectMissingParams(
    ['id', 'attestationObject', 'rawId', 'clientDataJson', 'transports'],
    event
  );
  if (missingParams)
    return callback(
      `Missing parameters; please provide: '${missingParams.join(', ')}'.`
    );

  const requestBody = {
    content: {
      id: event.id,
      rawId: event.rawId,
      authenticatorAttachment: 'platform',
      type: 'public-key',
      response: {
        attestationObject: event.attestationObject,
        clientDataJSON: event.clientDataJson,
        transports: event.transports,
      },
    },
  };

  console.log('requestBody', requestBody);
  console.log('response object', requestBody.response);

  const verifyFactorURL = `${API_URL}/Factors/Approve`;

  try {
    const response = await axios.post(verifyFactorURL, requestBody, {
      auth: {
        username: ACCOUNT_SID,
        password: AUTH_TOKEN,
      },
    });
    return callback(null, {
      status:
        response.data.status === 'approved' ? 'verified' : response.data.status,
    });
  } catch (error) {
    if (error.response) {
      console.log(error.response.data);
      console.log('Client has given an error', error);
    } else if (error.request) {
      console.log('Runtime error', error);
    } else {
      console.log(error);
    }
    return callback(null, error);
  }
};
