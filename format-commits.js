const AWS = require('aws-sdk');
const email = require('./send-email.js');

const s3 = new AWS.S3();
const ses = new AWS.SES();
const mainBucket = 'relase-notes-v1';
const workLink = 'http://ffeusplmsap97:8080/tfs/ADS.FCS/SFiles_Keysafe/_workitems?_a=edit&id='


exports.handler = async (event) => {
 const params = {
  Bucket: mainBucket,
 };
 let setLinks = (str, searchFor) => {
     let newStr = str;
     const regx = new RegExp(searchFor +'[0-9]+', 'g');
     const regxNoHash = new RegExp(searchFor);
     let items =  str.match(regx) || [];
     items.forEach((a)=> {
        newStr = str.replace(a, '<a href='+ workLink + a.replace(regxNoHash, '')+'>'+ a + ' </a> ');
    });
     return newStr;
 };
 
    return s3.listObjects(params).promise().then(function(data) {
        data.Contents.sort((a, b) => {
            const ad = new Date(a.LastModified);
            const bd = new Date(b.LastModified);
            return ad - bd;
        });
        const firstLog = s3.getObject({Bucket: mainBucket, Key:  data.Contents[0].Key}).promise();
        const secondLog = s3.getObject({Bucket: mainBucket, Key:  data.Contents[1].Key}).promise();
        return Promise.all([firstLog, secondLog]).then(function(obj) {
            const firstLogData = obj[0].Body.toString();
            const secondLogData = obj[1].Body.toString();
            const getDiff = (string, diffBy) => string.split(diffBy).join('');
            let changes = getDiff(secondLogData, firstLogData)
                .replace(/\n\S*/, '<br>')
                .replace(/^\S* /, '<br>');
            changes = setLinks(changes, 'Bug');
            changes = setLinks(changes, 'Task');
            const fullBody = 'Hi team! <br><br> a new build has been done for <b> dev/Story</b>, here are the changes:<br>' + changes;
            
            return email.sendEmail(ses, fullBody, 'Test email').then((data) => {
                return {
                    statusCode: 200,
                    body: data
                };
            }).catch(function(err) {
            return  {
                statusCode: 501,
                body: 'error at send email '+ JSON.stringify(err),
            };
        });

            
        }).catch(function(err) {
            return  {
                statusCode: 501,
                body: 'error at promise All '+ JSON.stringify(err),
            };
        });
    }).catch(function(err) {
        return  {
            statusCode: 501,
            body: 'error at list obj' + JSON.stringify(err),
        };
    });
    
};
