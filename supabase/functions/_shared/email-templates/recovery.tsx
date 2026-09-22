/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="uz" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>{siteName} uchun parolingizni tiklang</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Parolni tiklash</Heading>
        <Text style={text}>
          Sizning {siteName} akkauntingiz uchun parolni tiklash so'rovi
          qabul qilindi. Yangi parol tanlash uchun quyidagi tugmani bosing.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Parolni tiklash
        </Button>
        <Text style={footer}>
          Agar bu so'rovni siz yubormagan bo'lsangiz, bu xatni e'tiborsiz
          qoldirishingiz mumkin. Parolingiz o'zgarmaydi.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
