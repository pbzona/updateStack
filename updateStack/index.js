const AWS = require('aws-sdk');

exports.handler = (event, context) => {

  console.log(`REQUEST RECEIVED:\n + ${JSON.stringify(event)}`);

  if (event.RequestType == 'Delete') {
    sendResponse(event, context, 'SUCCESS');
    return;
  }

  let responseStatus = 'FAILED';
  let responseData = {};

  const CF = new AWS.CloudFormation();
  const stack = event['StackId'];
  const updated = event['ResourceProperties']['updatedStack'];

  const params = {
    StackName: stack,
    TemplateURL: updated
  }

  CF.updateStack(params, (err, res) => {
    if (err) {
      responseData = { Error: 'Failed to update the stack' }
      console.log(`${responseData.Error}:\n ${err}`);
    }
    responseStatus = 'SUCCESS';
    responseData = JSON.stringify(res);

    sendResponse(event, context, responseStatus, responseData);
  });
};

function sendResponse(event, context, responseStatus, responseData) {
  var responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: `See the details in CloudWatch Log Stream: ${context.logStreamName}`,
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData
  });

  console.log(`RESPONSE BODY:\n ${responseBody}`);

  const https = require('https');
  const url = require('url');

  const parsedUrl = url.parse(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: 'PUT',
    headers: {
      'content-type': '',
      'content-length': responseBody.length
    }
  };

  console.log('SENDING RESPONSE...\n');

  const request = https.request(options, function(response) {
    console.log('STATUS: ' + response.statusCode);
    console.log('HEADERS: ' + JSON.stringify(response.headers));
    context.done();
  });

  request.on('error', function(error) {
    console.log('sendResponse Error:' + error);
    context.done();
  });

  request.write(responseBody);
  request.end();
}
