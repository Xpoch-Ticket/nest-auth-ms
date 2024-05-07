import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { LoginUserDto, RegisterUserDto } from 'src/dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/dto/interfaces/jwt-payload.interface';
import { envs } from 'src/config/envs';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly jwtService: JwtService,
  ){
    super()
  }

  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the Auth database');
  }

  async signJWT(payload: JwtPayload) {
    return this.jwtService.sign(payload);
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
                password: bcrypt.hashSync(password, 10)
            }
        })

        const { password: __, ...userWithoutPassword } = newUser;

        return{
            user: userWithoutPassword,
            token: await this.signJWT(userWithoutPassword),
        }

    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        status: 400,
        message: error.message,
      });
    }
  }

    async loginUser( loginUserDto: LoginUserDto) {
    const { email, password} = loginUserDto;
    try {
        const user = await this.user.findUnique({
            where :{
                email : email
            }
        })

        if(!user){
            throw new RpcException({
                status: 400,
                message: 'User does not exist',
              });
        }
        const isPasswordValid = bcrypt.compareSync(password, user.password);

        if(!isPasswordValid){
            throw new RpcException({
                status: 400,
                message: 'Invalid password',
              });
        }
        
        const { password: __, ...userWithoutPassword } =   user;

        return{
            user: userWithoutPassword,
            token: await this.signJWT(userWithoutPassword),
        }

    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        status: 400,
        message: error.message,
      });
    }
  }

  async verifyToken(token: string) {
    try{
        const { sub, iat, exp, ... user} = this.jwtService.verify(token,{
          secret: envs.jwtSecret
        });
        return {
          user: user,
          token: await this.signJWT(user)
        }
    }catch(error){
        throw new RpcException({
            status: 400,
            message: 'Invalid token',
          });
    }
  }
}
