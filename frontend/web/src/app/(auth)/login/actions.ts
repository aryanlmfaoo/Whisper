"use server"
import axios from 'axios';
import { redirect } from 'next/navigation';
import {config} from "dotenv";

config();

const GATEWAY_URL = process.env.GATEWAY_URL

interface successfulReq
{
    success:true,
    token:string
}

interface unsuccessfulReq
{
    success:false,
    message:string
}

export async function authenticate(formData: FormData) {
  const emailOrUsername = formData.get('emailOrUsername') as string;
  const password = formData.get('password') as string;
  console.log(emailOrUsername);
  console.log(password);

  const res = await axios.post(`${GATEWAY_URL}`, {
    service:"AUTH",
    body:{
        emailOrUsername:emailOrUsername,
        password:password
    },
    method : "POST",
    path:"/login"}
  )

  const result: successfulReq | unsuccessfulReq= res.data
  console.log(result);

  if (result.success) {
    localStorage.setItem("token", result.token);
    redirect('/home'); // ✅ server-side redirect
  } else {
    redirect(`/login?error=${encodeURIComponent(result.message || 'Login failed')}`);
  }
}
