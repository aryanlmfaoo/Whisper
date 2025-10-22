import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { authenticate } from "./actions";

export default function Page({ searchParams }: { searchParams?: { error?: string } }) {

    return (
        <>
            <div className="flex flex-col justify-center items-center min-w-screen min-h-screen border border-black">
                <main className="bg-gray-100 border  border-gray-200 p-20 rounded-4xl justify-between">
                    <form action={authenticate} className="w-full mb-6 flex justify-center">
                        <Image
                            src={"/white-theme-logo.png"}
                            width={200}
                            height={200}
                            alt={"ChatterBox Logo"}
                        />
                    </form>
                    <Input name="emailOrUsername" className="bg-white mb-6" type="email" placeholder="Username or Email" />
                    <Input name="password" className="bg-white mb-6" type="password" placeholder="Password" />
                    <div className="flex flex-col justify-center">
                        <Button className="mb-6" variant="outline" >Log In</Button>

                        {searchParams?.error && (
                            <p className="text-red-500 text-center">{searchParams.error}</p>
                        )}

                        <p className="flex justify-center ">Dont have an account?&nbsp; <a
                            href="/signup"
                            className="underline">
                            Create one
                        </a>
                        </p>
                    </div>
                </main>
            </div >
        </>
    )
}
