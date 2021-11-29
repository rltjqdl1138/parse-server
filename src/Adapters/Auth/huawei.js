"use strict";

const https = require('https');
var Parse = require('parse/node').Parse;

const TOKEN_ISSUER = "https://accounts.huawei.com";
const HUAWEI_URL =   "https://oauth-login.cloud.huawei.com/oauth2/v3/tokeninfo";


function getDataFromHuawei(id_token){
  return new Promise((resolve, reject) => {
    https.get(`${HUAWEI_URL}?id_token=${id_token}`, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk.toString('utf8');
      });
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    }).on('error', reject);
  });
}


async function verifyIdToken({ id_token: token, id }) {
  if (!token) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, `id token is invalid for this user.`);
  }
  const huaweiData = await getDataFromHuawei(token);
  // Error from huawei
  if(!huaweiData || huaweiData.error){
    throw new Parse.Error(Parse.Error.OTHER_CAUSE,
      huaweiData.error_description ?
        `${huaweiData.error_description} (${huaweiData.error}::${huaweiData.sub_error})` :
        `undefined Error from huawei (${huaweiData.error}::${huaweiData.sub_error || "No SubError"}})`
    );
  }
  const { sub, iss, exp, iat } = huaweiData;

  // Content Check
  if(iss !== TOKEN_ISSUER)
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'ID token not issued by correct provider.');
  if(id !== sub)
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'auth data is invalid for this user.');

  // Expiration Check
  if(exp < Date.now() / 1000)
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'ID token is expired');
  if(iat > Date.now() / 1000)
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'ID token not issued by correct provider or method');
} // Returns a promise that fulfills if this user id is valid.


function validateAuthData(authData, options = {}) {
  return verifyIdToken(authData, options);
}

function validateAppId() {
  return Promise.resolve();
}

module.exports = {
  validateAppId: validateAppId,
  validateAuthData: validateAuthData
};
