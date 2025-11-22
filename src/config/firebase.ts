import admin from "firebase-admin";
import * as dotenv from "dotenv";
dotenv.config();


const serviceAccount = {
  type: "service_account",
  projectId: "petsnap-12335",
  privateKeyId: "fe19c39f2a33a682613b2819f2a455fabb8d0932",
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDfyqkdCslNMOOp\n2vF9ZA+G54fNnbzcTNJLD2II/uGiYzSFa37xPLVa9V/0XktvG5v0YAciDHRn1kY2\nawYS2GiCmFm1StrI/WRVPfRJCLt/9+JwmOcWPTGGyfaYGPefd76JoI0yBWXow4XF\nLwTm8NAoJ9FS/UUMqlxgC5GVyShFXXG9H1UoWDSbEKRixSZ9+d+T7Ih7OfJAfCWc\n/HgrsqDX2rJO272R0UDSONhEBK0AjvkfAAVcIM2shaGaVyIENuByjoPAXlZyUbx4\nVvSYfAE0DkE2qw1lllQ0DtV2dWt7/eWs/7iumqEl1umRyi3//VH+klX2n69s9XGy\nbToKwf5VAgMBAAECggEAEZ3beCzMMeZiVZGlpvBEhKMfPqFnJ5RojX4Vgo3F50mV\n7dbLdGQKBrIALrVpjMKIoVEZ3qVKWI42krwUC1G70GP709ijpmTEDC3HWCR21hkG\nW0S+FDMW/fxSDCETBRuhBSZ9Vu2z2wHhOud7pE5apH6V7MmBMQEMKodem4LtR6Bw\nySOBaOLYYMbV1OemfilNke72pOLt+2KJdD04UHtkP7aqQAAN45MRGVXQ6em/+FTR\nOSWYtr61TaE89KJau8j1Dts0Rd+w2V39ADnhMNZjc0hE9SJkS/dvPHz3X/MSKrO/\n/gjYGOfV7cizVZRd9MSifq6AXtsyDwgAQ1vLvCwXQQKBgQD4PTfnASV3q3/mZYJ2\n+p+de3qhvCmbFy20kexrQUhDRtBCzJdQM6GiOgRz6BNzRIokw9Uz3QoZFyO3MPd0\n210tyfjuQKZta7zcrS08G/IxvG5Mf2q2vM20j3Cugd9RqoLsJa75K6OcinMRH2JM\nGzMdhNbVOaZK9hLe1OTtmvVuZQKBgQDmycbZ3PN08/ie1u2p0N9O4uBU0MAbstU5\nFKfqfiejIaTDChFScQtpYTpI4cohEXqBY894m0DIUPn6ZXAuqocvK1/8XInGiRh0\nGmpOzjyu+y/MWmQk65aYNB1XF8u8ikbjAsh6v3Udoqc58LVqP5GfceRwPvSuvL/4\n+DnkIgAZMQKBgQDa+JVhTh+QylVOFOjarwUxU4S/Ok2xIucMS1Qy4CkwPzziT7qB\n4qmHgon+/A58NU9uUti0oRyROVol9Cm0iPROucS91YV5K/oy5wfp5/TibocVL6gg\nfbcuuQD6zlEBptlKGYuY/CecpHwP9JEu9SdHuLAQ8oN/yESpDz7JYVFyCQKBgA4K\nSnmoknsT+JUZOD4zgdJXxRQD2xwURhqB4jFG2Xx4KIDhFOqyC+KuUpBqhBR87rn+\na3nH4CoPmxWbpDaCk1TQS7ebnZohbwZpMPx4WYK/r0m8WglQ98lsqjhJL1DaDLP0\n0GN/UE2sPoYs2ayMD3zmveICQnp66ybnWwZA90aRAoGAAxhGE+GqodFK+uyXcXg8\nqRd4v4DDBzwKEkcQeRmeZe9LrsAr4Ng5FTmKOPCQGC8N42lMnZ6c6DNA2nFqMOja\nERV26f2EDoQL3uh5WJvLX/hQxXvyYZGoyx71+oQfbI1U56Q3bgs5zv8aKsqm1brC\nQFLJmhHRV7gKsPtNOTru/nQ=\n-----END PRIVATE KEY-----\n",
  clientEmail: "firebase-adminsdk-fbsvc@petsnap-12335.iam.gserviceaccount.com",
  clientId: "101175382290156869628",
  authUri: "https://accounts.google.com/o/oauth2/auth",
  tokenUri: "https://oauth2.googleapis.com/token",
  authProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
  clientX509CertUrl: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40petsnap-12335.iam.gserviceaccount.com",
  universeDomain: "googleapis.com"
};;




admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
