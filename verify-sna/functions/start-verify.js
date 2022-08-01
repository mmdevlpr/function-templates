/**
 * Create a new verification
 *
 * Creates a new SNA verification for a given phone number
 *
 * Pre-requisites
 * - Create a Verify Service (https://www.twilio.com/console/verify/services)
 * - Add VERIFY_SERVICE_SID from above to your Environment Variables (https://www.twilio.com/console/functions/configure)
 * - Enable ACCOUNT_SID and AUTH_TOKEN in your functions configuration (https://www.twilio.com/console/functions/configure)
 *
 * Parameters
 * - countryCode - required
 * - phoneNumber - required
 *
 * Returns JSON
 *
 * on Success:
 * {
 *      "message": string
 *      "snaUrl": string
 * }
 *
 * on Error:
 * {
 *      "message": string
 * }
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3');

// eslint-disable-next-line consistent-return
exports.handler = async function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');

  try {
    const client = context.getTwilioClient();
    const service = context.VERIFY_SERVICE_SID;

    const [countryCode, phoneNumber] = [event.countryCode, event.phoneNumber];

    // TODO: Check that country code and phone number are present and correct

    /* const verification_test = await client
         .verify
         .services(service)
         .verifications
         .create({to: `+${countryCode}${phoneNumber}`, channel: 'sna'});
 
         console.log(verification_test); */

    const verification = {
      to: `+${countryCode}${phoneNumber}`,
      sna: {
        url: 'https://mi.dnlsrv.com/m/id/3tHbGDGD?data=TGSDDSFSD4',
      },
    };

    response.setStatusCode(200);
    response.setBody({
      message: 'Creation of SNA verification successful',
      snaUrl: verification.sna.url,
    });

    // Connecting to database
    const dbName = 'verifications_db.db';
    const db = new sqlite3.Database(
      path.join(os.tmpdir(), dbName),
      sqlite3.OPEN_READWRITE,
      (err) => {
        if (err && err.code === 'SQLITE_CANTOPEN') {
          // Create database
          const newdb = new sqlite3.Database(
            path.join(os.tmpdir(), dbName),
            (err) => {
              if (err) {
                const statusCode = err.status || 400;
                response.setStatusCode(statusCode);
                response.setBody({
                  message: err.message,
                });
                return callback(null, response);
              }
              // Table(s) creation
              newdb.exec(
                `
                     CREATE TABLE verifications (
                         phone_number VARCHAR(30) NOT NULL,
                         sna_url VARCHAR(500) NOT NULL,
                         status VARCHAR(10) NOT NULL,
                         verification_start_datetime DATETIME,
                         verification_check_datetime DATETIME,
                         PRIMARY KEY (phone_number, sna_url)
                     );
                     `,
                (err) => {
                  if (err) {
                    const statusCode = err.status || 400;
                    response.setStatusCode(statusCode);
                    response.setBody({
                      message: err.message,
                    });
                    return callback(null, response);
                  }
                  runQueries(newdb);
                }
              );
            }
          );
        } else if (err) {
          const statusCode = err.status || 400;
          response.setStatusCode(statusCode);
          response.setBody({
            message: err.message,
          });
          return callback(null, response);
        }
        runQueries(db);
      }
    );

    // Run queries in database
    function runQueries(db) {
      db.get(
        `
             SELECT status
             FROM verifications
             WHERE phone_number = ? AND sna_url = ?;
             `,
        [verification.to, verification.sna.url],
        (err, row) => {
          if (err) {
            const statusCode = err.status || 400;
            response.setStatusCode(statusCode);
            response.setBody({
              message: err.message,
            });
            return callback(null, response);
          }
          if (!row) {
            db.run(
              `
                     INSERT INTO verifications (phone_number, sna_url, status, verification_start_datetime, verification_check_datetime)
                     VALUES (?, ?, 'pending', DATETIME('NOW'), NULL);
                     `,
              [verification.to, verification.sna.url],
              (err) => {
                if (err) {
                  const statusCode = err.status || 400;
                  response.setStatusCode(statusCode);
                  response.setBody({
                    message: err.message,
                  });
                  return callback(null, response);
                }
                return callback(null, response);
              }
            );
          } else {
            return callback(null, response);
          }
        }
      );
    }
  } catch (error) {
    const statusCode = error.status || 400;
    response.setStatusCode(statusCode);
    response.setBody({
      message: error.message,
    });
    return callback(null, response);
  }
};
