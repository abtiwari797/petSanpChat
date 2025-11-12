import admin from "firebase-admin";
import * as dotenv from "dotenv";
dotenv.config();

const serviceAccount = {
  type: "service_account",
  projectId: "petsnapchat-188ad",           // camelCase
  privateKeyId: "a39ab3e56db9bfe213bba038381ebf1d0ee3c27d",
  privateKey:  "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCHSbOcEJh1jgOe\nQ98jvjQLG5cUiB6EBdwgxzcjV0ysTC27zHrRiBacqdafEqhc1+2AYP0r+/H8cpHV\nUF5hYyOzI5GY3JE4hnBxnugzTD5xAJCnM/9wBZD9zDnSHUKCpMSYIIL+gJPfOe6K\naLS3mFrUSVY2aTL4eUhfTBXYOoq9uRboLlCwd8FzCtVfgqt+x0NpVcRV+2Bb9slX\n76h/fNIhOc656WDvQWZcrxc8PjygK8U8cbQK022lzC+PsqR5LeZpmikpgOQttvYi\nVRbdBci/H0zjXObEQW4TYAsfKhZzRZbg4gAodJ/NuoINyvQ5SyHyMIl71LRFeYba\nF4nop9xDAgMBAAECggEAAnb7SLqcrHeb5URDSnlqpVEpXXxlYe5hZk9616/9e54f\nry44hpy+HLiTam6Clr5wW0hpFGYQsJK9yW8faRLPUbIyMuDB3I/GeKt2e4jGEnT6\nLbGq07WmQJl57DQQRCUQV90vxcc96nE5wVfLAxVJglibs34TKae8A9B1DW1znaU8\n13q73hb62/fcswvOgmF6+Sz3RUhm1sPbuCak8H7Y6BfMWB5hfUilbVJUzDaAwH4Z\nx+mJqyNx3WLguj5yZ7pnjSd8U+QN7oPtXlksBvw4JNP2KWjC0YV/hSND8HRLX8rj\nCtM4sLMIuV0BmMbrm0iNW0H42sgd8Z/cBJXW9StK0QKBgQC8h9m+V2bsD205edXz\nRtfPdEKj4bR9YR1bL7yq4EBfu97gZzoXkdHK7IbVyvLWF1Ab+uzTjauu8EKn+lDt\nNIfUpTvYPMUlEc1RBbQ5yXQa22K3C0hFHUNDl4Rw94HxqKVxU/qDFOqt3i3zsbg6\npM4RgSPGA142Rs2eb0z0Ccb9nwKBgQC3tAoZPyfJLdwSe6Zh/ML+wFgR0kG2/bOX\nUiUI9J18fFwfp28Mi7fsfYCQp+dH4CcSvZdn2RxheqGExSgdt2V5NH6WhpgxerXI\npN/RdwASAbsWMYESXnS5JDZHdF0jfIaq+OhzOwxtWRgkfWjVaLc+yz57RMwZR5yM\nIKM7mqTW3QKBgQCYAJPfMgrKUpnGmGOWdEy1d0/vX5+s4urPRUrBHnLofMlydefR\nbwENsev4XVuynzM4i/P7kSKVtiKX2mr7BLprCRmZ+00b2SGHrKilWrYgnTcWy6Lm\nDnTX/0aJ6hQ7qbRSDdpRa0DXE+ZKr8QQjCWU2WDlWnvQGP/ZOHV74JIukwKBgCDt\naX36/wOlb7P0a+9WYhFNoruXB2ZodR9jfvXq+quMkuqtlU8XYCFIoZnMLr2IZRiL\n2S6pENg8JeVpfXZOICcojKQoffEogJr1SpT+Eoonu0QQHYWQXrWs0vnd1q/8qxrM\nQMYeyGx1MsmfnQHbojTkM0/fFgJV/q5zTy7o2jEVAoGASWZNlXVUD05SaVs1NQhk\nGINb7Wln3T7G5B/rNr8XQigMhiFOQGoDdGLMGGeZzn1mswRQHwuFAIi/nBcXqFHL\nBp3VU/P/6Q2+/zoJXXu/BUDd88CTr9IDR+yNoJVFYR1978cnrxLogRdC1HMCeRUm\nse/X8GWV3CQq9VhPZaeacVo=\n-----END PRIVATE KEY-----\n",
   clientEmail: "firebase-adminsdk-fbsvc@petsnapchat-188ad.iam.gserviceaccount.com",
  clientId: "113579521094223818716",
  authUri: "https://accounts.google.com/o/oauth2/auth",
  tokenUri: "https://oauth2.googleapis.com/token",
  authProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
  clientX509CertUrl: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40petsnapchat-188ad.iam.gserviceaccount.com",
  universeDomain: "googleapis.com"
};




admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
