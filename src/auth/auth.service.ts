import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { RegisterUserDto } from 'src/dto';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('AuthService');

  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the database');
  }

  async registerUser( registerUserDto: RegisterUserDto) {
    const { email, name, password} = registerUserDto;
    try {
        const user = await this.user.findUnique({
            where :{
                email : email
            }
        })

        if(user){
            throw new RpcException({
                status: 400,
                message: 'User already exists',
              });
        }

        const newUser = await this.user.create({
            data: {
                email,
                name,
                password
            }
        })

        return{
            user: newUser,
            token: 'ABC'
        }

    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        status: 400,
        message: error.message,
      });
    }
  }
}
