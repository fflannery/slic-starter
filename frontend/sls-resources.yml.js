const frontendUrl = process.env.SLIC_NS_DOMAIN
  ? `$\{self:custom.siteDomainName}`
  : '!GetAtt siteBucket.WebsiteURL'

module.exports = () =>
  require('yamljs').parse(`
siteBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: $\{self:custom.bucketName}
    WebsiteConfiguration:
      IndexDocument: index.html
      ErrorDocument: index.html

siteBucketPolicy:
  Type: AWS::S3::BucketPolicy
  Properties:
    Bucket:
      Ref: siteBucket
    PolicyDocument:
      Statement:
        - Action:
            - 's3:GetObject'
          Effect: 'Allow'
          Principal: '*'
          Resource: 'arn:aws:s3:::$\{self:custom.bucketName}/*'

frontendUrl:
  Type: AWS::SSM::Parameter
  Properties:
    Name: /$\{self:provider.stage}/frontend/url
    Type: String
    Value: '${frontendUrl}'

${
  process.env.SLIC_NS_DOMAIN
    ? `
siteDistribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Origins:
        - DomainName: !GetAtt siteBucket.DomainName
          Id: $\{self:custom.bucketName}-origin
          S3OriginConfig:
            OriginAccessIdentity: ''
      Enabled: true
      DefaultRootObject: index.html
      HttpVersion: http2
      Aliases:
        - $\{self:custom.siteDomainName}
      DefaultCacheBehavior:
        AllowedMethods:
          - DELETE
          - GET
          - HEAD
          - OPTIONS
          - PATCH
          - POST
          - PUT
        TargetOriginId: $\{self:custom.bucketName}-origin
        ForwardedValues:
          QueryString: 'false'
          Cookies:
            Forward: none
        ViewerProtocolPolicy: redirect-to-https
      ViewerCertificate:
        AcmCertificateArn: $\{self:custom.siteConfig.siteCert}
        SslSupportMethod: sni-only
      CustomErrorResponses:
        - ErrorCode: 403
          ResponseCode: 200
          ResponsePagePath: / - ErrorCode: 404
          ResponseCode: 200
          ResponsePagePath: /

webRecordSets:
  Type: AWS::Route53::RecordSetGroup
  Properties:
    HostedZoneId: $\{self:custom.siteConfig.publicHostedZone}
    RecordSets:
      - Name: $\{self:custom.siteDomainName}
        Type: A
        AliasTarget:
          DNSName: { Fn::GetAtt: [siteDistribution, DomainName] }
          HostedZoneId: $\{self:custom.cloudFrontHostedZoneId}
`
    : ''
}`)
