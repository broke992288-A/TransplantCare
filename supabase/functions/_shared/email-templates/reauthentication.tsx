/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="uz" dir="ltr">
    <Head />
    <Preview>Tasdiqlash kodingiz</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Shaxsingizni tasdiqlang</Heading>
        <Text style={text}>
          Shaxsingizni tasdiqlash uchun quyidagi kodni kiriting:
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Bu kod tez orada yaroqsiz bo'ladi. Agar bu so'rovni siz yubormagan
          bo'lsangiz, bu xatni e'tiborsiz qoldirishingiz mumkin.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(199, 89%, 48%)',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: 'hsl(215, 14%, 46%)', margin: '30px 0 0' }
