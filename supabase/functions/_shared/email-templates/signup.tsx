/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="uz" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>{siteName} uchun emailingizni tasdiqlang</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Emailingizni tasdiqlang</Heading>
        <Text style={text}>
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          'da ro'yxatdan o'tganingiz uchun rahmat!
        </Text>
        <Text style={text}>
          Iltimos, email manzilingizni (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) tasdiqlash uchun quyidagi tugmani bosing:
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Emailni tasdiqlash
        </Button>
        <Text style={footer}>
          Agar siz akkaunt yaratmagan bo'lsangiz, bu xatni e'tiborsiz
          qoldirishingiz mumkin.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '24px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(220, 25%, 10%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(215, 14%, 46%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(199, 89%, 48%)',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid hsl(199, 89%, 48%)',
  borderRadius: '10px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: 'hsl(215, 14%, 46%)', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: hsl(199, 89%, 48%) !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: hsl(199, 89%, 48%) !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: hsl(199, 89%, 48%) !important; color: #ffffff !important; }
`
