"use client";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import axios from "axios";
import { useRouter } from "next/navigation";

interface successfulReq {
    success: true,
    token: string
}

interface unsuccessfulReq {
    success: false,
    message: string
}


const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL;


export default function LoginPage() {
    const router = useRouter();
    const emailOrUsername = useRef<HTMLInputElement>(null);
    const password = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        console.time("time");
        setLoading(true);
        e.preventDefault();
        if (!emailOrUsername || !password || !emailOrUsername.current || !password.current) {
            setError("Both fields are required.");
            return
        }

        console.log(emailOrUsername.current.value, password.current.value)
        try {
            const res = await axios.post(`${GATEWAY_URL}`, {
                service: "AUTH",
                body: {
                    emailOrUsername: emailOrUsername.current.value,
                    password: password.current.value
                },
                method: "POST",
                path: "/login"
            }
            );

            const resultData: successfulReq | unsuccessfulReq = res.data;
            if (resultData.success) {
                localStorage.setItem("token", resultData.token);
                console.timeEnd("time");
                router.push("/signup");
            } else {
                console.error(res);
                setError(resultData.message || "Unknown error occured");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="flex flex-col justify-center items-center min-h-screen">
            <main className="bg-gray-100 border border-gray-200 p-10 rounded-xl w-[400px]">
                <form className="flex flex-col">
                    <div className="flex justify-center mb-6">
                        <Image
                            src="/white-theme-logo.png"
                            width={150}
                            height={150}
                            alt="ChatterBox Logo"
                        />
                    </div>

                    <Input
                        ref={emailOrUsername}
                        name="emailOrUsername"
                        className="bg-white mb-4"
                        type="text"
                        placeholder="Username or Email"
                        required
                    />

                    <Input
                        ref={password}
                        name="password"
                        className="bg-white mb-4"
                        type="password"
                        placeholder="Password"
                        required
                    />

                    <Button type="submit" variant="outline" disabled={loading} onClick={handleSubmit}>
                        {loading ? "Logging in..." : "Log In"}
                    </Button>

                    {error && (
                        <p className="text-center mt-4 text-sm text-gray-700">{error}</p>
                    )}
                </form>

                <p className="text-center mt-6 text-sm">
                    Don&apos;t have an account?{" "}
                    <a
                        href="/signup"
                        className="underline">
                        Create one
                    </a>
                </p>
            </main>
        </div>
    );
}
