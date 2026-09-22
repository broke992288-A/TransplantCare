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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="uz" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Siz {siteName} ga taklif qilindingiz</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Sizga taklifnoma</Heading>
        <Text style={text}>
          Siz{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>{' '}
          tizimiga taklif qilindingiz. Taklifni qabul qilish va akkaunt
          yaratish uchun quyidagi tugmani bosing.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Taklifni qabul qilish
        </Button>
        <Text style={footer}>
          Agar bu taklif siz uchun kutilmagan bo'lsa, bu xatni e'tiborsiz
          qoldirishingiz mumkin.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

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
